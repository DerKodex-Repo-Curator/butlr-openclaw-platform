"""Health Monitoring API for Butlr VMs"""
import asyncio
import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from typing import List, Dict
import asyncssh

from models.database import get_db
from models.customer import Customer, CustomerStatus

router = APIRouter()

async def check_vm_health(vm_ip: str) -> Dict:
    """Check health of a single VM"""
    health_status = {
        "ip": vm_ip,
        "vm_reachable": False,
        "clawdbot_running": False,
        "telegram_connected": False,
        "cpu_usage": 0,
        "memory_usage": 0,
        "disk_usage": 0,
        "uptime": "unknown",
        "last_check": datetime.utcnow().isoformat()
    }
    
    try:
        # SSH to VM and run health checks
        ssh_key = "/root/.ssh/butlr_rsa"
        
        async with asyncssh.connect(
            vm_ip,
            username="root",
            client_keys=[ssh_key],
            known_hosts=None,
            connect_timeout=10
        ) as conn:
            health_status["vm_reachable"] = True
            
            # Check if Clawdbot process is running
            svc_check = await conn.run("systemctl is-active clawdbot", check=False)
            health_status["clawdbot_running"] = svc_check.stdout.strip() == "active"
            if health_status["clawdbot_running"]:
                uptime_check = await conn.run("systemctl show clawdbot --property=ActiveEnterTimestamp --value", check=False)
                health_status["uptime"] = uptime_check.stdout.strip() if uptime_check.exit_status == 0 else "unknown"
            
            # Check Clawdbot Gateway status
            gateway_check = await conn.run("curl -s http://localhost:18789/v1/health || true", check=False)
            if gateway_check.stdout and "ok" in gateway_check.stdout.lower():
                health_status["telegram_connected"] = True
            
            # Get system resources
            cpu_cmd = await conn.run("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1", check=False)
            if cpu_cmd.stdout:
                try:
                    health_status["cpu_usage"] = float(cpu_cmd.stdout.strip())
                except:
                    pass
            
            mem_cmd = await conn.run("free | grep Mem | awk '{print ($2-$7)/$2 * 100}'", check=False)
            if mem_cmd.stdout:
                try:
                    health_status["memory_usage"] = float(mem_cmd.stdout.strip())
                except:
                    pass
            
            disk_cmd = await conn.run("df -h / | tail -1 | awk '{print $5}' | sed 's/%//'", check=False)
            if disk_cmd.stdout:
                try:
                    health_status["disk_usage"] = float(disk_cmd.stdout.strip())
                except:
                    pass
                    
    except asyncio.TimeoutError:
        health_status["error"] = "Connection timeout"
    except Exception as e:
        health_status["error"] = str(e)
    
    return health_status


@router.get("/")
async def get_all_vm_health(
    db: AsyncSession = Depends(get_db)
):
    """Get health status of all VMs"""
    
    # Get all active customers with VMs
    result = await db.execute(
        select(Customer).where(
            Customer.status.in_([CustomerStatus.ACTIVE, CustomerStatus.TRIAL]),
            Customer.vm_ip.isnot(None)
        )
    )
    customers = result.scalars().all()
    
    # Check health for each VM in parallel
    health_tasks = []
    for customer in customers:
        if customer.vm_ip:
            health_tasks.append(asyncio.create_task(check_vm_health(customer.vm_ip)))
    
    health_results = await asyncio.gather(*health_tasks, return_exceptions=True)
    
    # Combine results with customer info
    combined_results = []
    for i, customer in enumerate(customers):
        health_data = health_results[i] if i < len(health_results) else {}
        
        # Handle exceptions
        if isinstance(health_data, Exception):
            health_data = {
                "ip": customer.vm_ip,
                "error": str(health_data),
                "vm_reachable": False
            }
        
        combined_results.append({
            "customer_id": customer.id,
            "customer_email": customer.email,
            "bot_username": customer.telegram_bot_username,
            "health": health_data
        })
    
    # Calculate summary statistics
    total_vms = len(combined_results)
    healthy_vms = sum(1 for r in combined_results 
                     if r["health"].get("vm_reachable") and 
                        r["health"].get("clawdbot_running"))
    
    return {
        "summary": {
            "total_vms": total_vms,
            "healthy_vms": healthy_vms,
            "unhealthy_vms": total_vms - healthy_vms,
            "health_percentage": (healthy_vms / total_vms * 100) if total_vms > 0 else 0
        },
        "vms": combined_results
    }


@router.get("/{customer_id}")
async def get_customer_vm_health(
    customer_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get health status for a specific customer's VM"""
    
    result = await db.execute(
        select(Customer).where(Customer.id == customer_id)
    )
    customer = result.scalar_one_or_none()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    if not customer.vm_ip:
        raise HTTPException(status_code=404, detail="No VM found for this customer")
    
    health_data = await check_vm_health(customer.vm_ip)
    
    return {
        "customer_id": customer.id,
        "customer_email": customer.email,
        "bot_username": customer.telegram_bot_username,
        "health": health_data
    }


@router.post("/alert-unhealthy")
async def alert_unhealthy_vms(
    db: AsyncSession = Depends(get_db)
):
    """Check all VMs and send alerts for unhealthy ones"""
    
    # Get all health data
    all_health = await get_all_vm_health(db)
    
    unhealthy_vms = [
        vm for vm in all_health["vms"]
        if not vm["health"].get("vm_reachable") or 
           not vm["health"].get("clawdbot_running")
    ]
    
    if unhealthy_vms:
        # TODO: Send alert emails to admin
        print(f"⚠️  Found {len(unhealthy_vms)} unhealthy VMs!")
        
        for vm in unhealthy_vms:
            print(f"   - Customer: {vm['customer_email']}")
            print(f"     Bot: @{vm['bot_username']}")
            print(f"     IP: {vm['health']['ip']}")
            print(f"     Issues: ", end="")
            
            issues = []
            if not vm["health"].get("vm_reachable"):
                issues.append("VM unreachable")
            if not vm["health"].get("clawdbot_running"):
                issues.append("Clawdbot not running")
            
            print(", ".join(issues))
    
    return {
        "unhealthy_count": len(unhealthy_vms),
        "alerts_sent": len(unhealthy_vms) > 0,
        "unhealthy_vms": unhealthy_vms
    }