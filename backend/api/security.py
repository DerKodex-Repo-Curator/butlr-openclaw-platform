"""Security — ClawShield integration for customer VMs"""
import re
import asyncssh
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db
from models.customer import Customer
from api.souls import get_customer_from_token


SKILLS_DIR = "/usr/lib/node_modules/openclaw/skills"


def _strip_ansi(text: str) -> str:
    return re.sub(r'\x1b\[[0-9;]*m', '', text)


def _parse_scan_output(output: str) -> dict:
    """Parse ClawShield ANSI scan output into structured data"""
    clean = _strip_ansi(output)

    score_match = re.search(r'Security Score:\s*([A-F][+]?)\s+(\d+)/100', clean)
    grade = score_match.group(1) if score_match else "?"
    score = int(score_match.group(2)) if score_match else None

    pass_match = re.search(r'(\d+)\s+passed', clean)
    warn_match = re.search(r'(\d+)\s+warnings?', clean)
    fail_match = re.search(r'(\d+)\s+failed', clean)

    passed = int(pass_match.group(1)) if pass_match else 0
    warned = int(warn_match.group(1)) if warn_match else 0
    failed = int(fail_match.group(1)) if fail_match else 0

    details = []
    current_category = ""
    lines = clean.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i].strip()

        cat_match = re.match(r'^──\s+(\w+)\s+──$', line)
        if cat_match:
            current_category = cat_match.group(1).title()
            i += 1
            continue

        check_match = re.match(r'[✅⚠️❌]+\s+(PASS|WARN|FAIL)\s+(.+)', line)
        if check_match:
            status = check_match.group(1).lower()
            name = check_match.group(2).strip()
            message = ""
            fix = ""

            if i + 1 < len(lines):
                desc_line = lines[i + 1].strip()
                if desc_line and not desc_line.startswith(('✅', '⚠', '❌', '──', '══')):
                    message = desc_line
                    i += 1

            if i + 1 < len(lines):
                fix_line = lines[i + 1].strip()
                if fix_line.startswith('💡 Fix:'):
                    fix = fix_line.replace('💡 Fix:', '').strip()
                    while i + 2 < len(lines):
                        next_line = lines[i + 2].strip()
                        if next_line and not next_line.startswith(('✅', '⚠', '❌', '──', '══', '💡')):
                            fix += '\n' + next_line
                            i += 1
                        else:
                            break
                    i += 1

            details.append({
                "name": name,
                "status": status,
                "message": message,
                "fix": fix,
                "category": current_category,
            })

        i += 1

    return {
        "installed": True,
        "score": score,
        "grade": grade,
        "checks": {"pass": passed, "warn": warned, "fail": failed},
        "details": details,
        "message": "Scan complete",
    }


def _parse_skill_scan_output(output: str) -> dict:
    """Parse ClawShield skill-scan output into structured findings"""
    clean = _strip_ansi(output)

    findings = []
    # Match lines like: skill-name/path/file.py:123 — Description text
    for line in clean.split('\n'):
        line = line.strip()
        finding_match = re.match(
            r'(\S+?)/(.+?):(\d+)\s+[—-]\s+(.+)',
            line,
        )
        if finding_match:
            skill = finding_match.group(1)
            file_path = finding_match.group(2)
            line_num = int(finding_match.group(3))
            description = finding_match.group(4)

            # Determine severity from context
            severity = "low"
            for sev_line in clean.split('\n'):
                sev_line = sev_line.strip()
                if 'HIGH' in sev_line:
                    # Check if our finding follows a HIGH header
                    pass
                if 'MEDIUM' in sev_line:
                    pass

            findings.append({
                "skill": skill,
                "file": f"{skill}/{file_path}",
                "line": line_num,
                "description": description,
                "severity": "unknown",
            })

    # Now assign severity by re-parsing with section awareness
    current_severity = "low"
    for line in clean.split('\n'):
        line = line.strip()
        if 'HIGH' in line and ('❌' in line or '(' in line):
            current_severity = "high"
        elif 'MEDIUM' in line and ('⚠' in line or '(' in line):
            current_severity = "medium"
        elif 'LOW' in line and ('💡' in line or '(' in line):
            current_severity = "low"
        else:
            fm = re.match(r'(\S+?)/(.+?):(\d+)\s+[—-]\s+(.+)', line)
            if fm:
                skill_name = fm.group(1)
                for f in findings:
                    if f["skill"] == skill_name and f["line"] == int(fm.group(3)):
                        f["severity"] = current_severity

    # Extract verdict
    verdict_match = re.search(r'Verdict:\s*(.+)', clean)
    verdict = verdict_match.group(1).strip() if verdict_match else "Unknown"

    total_match = re.search(r'Findings:\s*(\d+)\s*total', clean)
    total = int(total_match.group(1)) if total_match else len(findings)

    # Get unique suspicious skills
    sus_skills = list(set(f["skill"] for f in findings if f["severity"] in ("high", "medium")))

    return {
        "success": True,
        "verdict": verdict,
        "total_findings": total,
        "findings": findings,
        "suspicious_skills": sus_skills,
        "raw": clean[:3000],
    }


def _parse_harden_output(output: str) -> dict:
    """Parse ClawShield harden output"""
    clean = _strip_ansi(output)
    fixed = []
    skipped = []
    for line in clean.split('\n'):
        if '✅' in line or 'Fixed' in line or 'Applied' in line:
            fixed.append(line.strip())
        elif '⏭' in line or 'Skipped' in line:
            skipped.append(line.strip())
    return {"fixed": fixed, "skipped": skipped, "raw": clean[:2000]}


router = APIRouter()
security = HTTPBearer(auto_error=False)
SSH_KEY_PATH = "/root/.ssh/butlr_rsa"


@router.get("/status")
async def security_status(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    """Check if ClawShield is installed and get security score"""
    customer = await get_customer_from_token(credentials, db)
    vm_ip = customer.vm_ip
    if not vm_ip:
        return {"installed": None, "score": None, "grade": None, "checks": {"pass": 0, "warn": 0, "fail": 0}, "message": "No VM assigned"}

    try:
        async with asyncssh.connect(
            vm_ip, username="root", client_keys=[SSH_KEY_PATH],
            known_hosts=None, connect_timeout=10,
        ) as conn:
            check = await conn.run("which clawshield 2>/dev/null", check=False)
            if check.exit_status != 0:
                return {"installed": False, "score": None, "grade": None, "checks": {"pass": 0, "warn": 0, "fail": 0}, "message": "ClawShield not installed"}

            result = await conn.run("clawshield scan 2>&1", check=False, timeout=60)
            return _parse_scan_output(result.stdout or "")

    except Exception as e:
        return {"installed": None, "score": None, "grade": None, "checks": {"pass": 0, "warn": 0, "fail": 0}, "message": f"VM unreachable: {str(e)[:100]}"}


@router.post("/scan")
async def run_scan(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    """Run a fresh ClawShield security scan"""
    customer = await get_customer_from_token(credentials, db)
    vm_ip = customer.vm_ip
    if not vm_ip:
        raise HTTPException(status_code=400, detail="No VM assigned")

    try:
        async with asyncssh.connect(
            vm_ip, username="root", client_keys=[SSH_KEY_PATH],
            known_hosts=None, connect_timeout=10,
        ) as conn:
            result = await conn.run("clawshield scan 2>&1", check=False, timeout=60)
            parsed = _parse_scan_output(result.stdout or "")
            parsed["success"] = True
            return parsed
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)[:200])


@router.post("/harden")
async def harden_vm(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    """Run ClawShield auto-hardening on customer VM"""
    customer = await get_customer_from_token(credentials, db)
    vm_ip = customer.vm_ip
    if not vm_ip:
        raise HTTPException(status_code=400, detail="No VM assigned")

    try:
        async with asyncssh.connect(
            vm_ip, username="root", client_keys=[SSH_KEY_PATH],
            known_hosts=None, connect_timeout=15,
        ) as conn:
            result = await conn.run("clawshield harden --auto 2>&1", check=False, timeout=120)
            harden_result = _parse_harden_output(result.stdout or "")

            scan_result = await conn.run("clawshield scan 2>&1", check=False, timeout=60)
            scan_parsed = _parse_scan_output(scan_result.stdout or "")

            return {
                "success": True,
                "hardening": harden_result,
                "scan": scan_parsed,
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)[:200])


@router.post("/install")
async def install_clawshield(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    """Install ClawShield on customer VM"""
    customer = await get_customer_from_token(credentials, db)
    vm_ip = customer.vm_ip
    if not vm_ip:
        raise HTTPException(status_code=400, detail="No VM assigned")

    try:
        async with asyncssh.connect(
            vm_ip, username="root", client_keys=[SSH_KEY_PATH],
            known_hosts=None, connect_timeout=15,
        ) as conn:
            install_cmds = [
                "curl -fsSL -o /tmp/clawshield https://github.com/lennystepn-hue/clawshield/releases/latest/download/clawshield-linux-amd64 || curl -fsSL -o /tmp/clawshield https://github.com/lennystepn-hue/clawshield/releases/download/v0.4.1/clawshield-linux-amd64",
                "chmod +x /tmp/clawshield",
                "mv /tmp/clawshield /usr/local/bin/clawshield",
            ]
            for cmd in install_cmds:
                await conn.run(cmd, check=False, timeout=30)

            verify = await conn.run("clawshield version 2>/dev/null || clawshield --version 2>/dev/null || echo NOTFOUND", check=False)
            if "NOTFOUND" in (verify.stdout or ""):
                raise HTTPException(status_code=500, detail="ClawShield binary could not be installed")

            return {"success": True, "message": "ClawShield installed"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)[:200])


@router.post("/skill-scan")
async def skill_scan(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    """Scan all installed skills for malicious code"""
    customer = await get_customer_from_token(credentials, db)
    vm_ip = customer.vm_ip
    if not vm_ip:
        raise HTTPException(status_code=400, detail="No VM assigned")

    try:
        async with asyncssh.connect(
            vm_ip, username="root", client_keys=[SSH_KEY_PATH],
            known_hosts=None, connect_timeout=10,
        ) as conn:
            result = await conn.run(f"clawshield skill-scan {SKILLS_DIR}/ 2>&1", check=False, timeout=60)
            return _parse_skill_scan_output(result.stdout or "")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)[:200])


class UninstallRequest(BaseModel):
    skill_name: str


@router.post("/uninstall-skill")
async def uninstall_skill(
    body: UninstallRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    """Remove a suspicious skill from the customer VM"""
    customer = await get_customer_from_token(credentials, db)
    vm_ip = customer.vm_ip
    if not vm_ip:
        raise HTTPException(status_code=400, detail="No VM assigned")

    skill_name = body.skill_name.strip()

    # Validate skill name — prevent path traversal
    if not re.match(r'^[a-zA-Z0-9_-]+$', skill_name):
        raise HTTPException(status_code=400, detail="Invalid skill name")

    skill_path = f"{SKILLS_DIR}/{skill_name}"

    try:
        async with asyncssh.connect(
            vm_ip, username="root", client_keys=[SSH_KEY_PATH],
            known_hosts=None, connect_timeout=10,
        ) as conn:
            # Verify skill exists
            check = await conn.run(f"test -d {skill_path} && echo EXISTS || echo NOTFOUND", check=False)
            if "NOTFOUND" in (check.stdout or ""):
                raise HTTPException(status_code=404, detail=f"Skill '{skill_name}' not found")

            # Remove the skill directory
            await conn.run(f"rm -rf {skill_path}", check=False, timeout=10)

            # Verify removal
            verify = await conn.run(f"test -d {skill_path} && echo EXISTS || echo REMOVED", check=False)
            if "EXISTS" in (verify.stdout or ""):
                raise HTTPException(status_code=500, detail="Failed to remove skill directory")

            return {"success": True, "message": f"Skill '{skill_name}' removed", "skill": skill_name}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)[:200])
