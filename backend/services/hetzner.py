"""Hetzner Cloud Service for VM provisioning"""
import os
from typing import Optional, Dict, Any
import httpx


class HetznerService:
    def __init__(self):
        self.token = os.getenv("HETZNER_API_TOKEN")
        self.base_url = "https://api.hetzner.cloud/v1"
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    async def _request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict:
        """Make API request to Hetzner"""
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method,
                f"{self.base_url}{endpoint}",
                headers=self.headers,
                json=data,
                timeout=60.0
            )
            
            if response.status_code >= 400:
                raise Exception(f"Hetzner API error: {response.text}")
            
            return response.json()
    
    async def get_ssh_key_id(self, key_name: str) -> Optional[int]:
        """Get SSH key ID by name"""
        result = await self._request("GET", "/ssh_keys")
        
        for key in result.get("ssh_keys", []):
            if key["name"] == key_name:
                return key["id"]
        
        return None
    
    async def create_vm(
        self,
        name: str,
        server_type: str = "cpx22",  # 3 vCPU, 4GB RAM, AMD EPYC
        image: str = "ubuntu-24.04",
        location: str = "nbg1",  # Falkenstein, Germany
        ssh_key_name: str = "butlr-vps"
    ) -> Optional[Dict[str, Any]]:
        """Create a new VM"""
        
        # Get SSH key ID
        ssh_key_id = await self.get_ssh_key_id(ssh_key_name)
        if not ssh_key_id:
            raise Exception(f"SSH key '{ssh_key_name}' not found")
        
        # Create server
        data = {
            "name": name,
            "server_type": server_type,
            "image": image,
            "location": location,
            "ssh_keys": [ssh_key_id],
            "start_after_create": True,
            "labels": {
                "service": "butlr",
                "managed": "true"
            },
            "user_data": self._get_cloud_init()
        }
        
        result = await self._request("POST", "/servers", data)
        
        server = result.get("server")
        if not server:
            return None
        
        return {
            "id": server["id"],
            "name": server["name"],
            "ip": server["public_net"]["ipv4"]["ip"],
            "status": server["status"]
        }
    
    async def get_vm(self, server_id: int) -> Optional[Dict[str, Any]]:
        """Get VM details"""
        result = await self._request("GET", f"/servers/{server_id}")
        
        server = result.get("server")
        if not server:
            return None
        
        return {
            "id": server["id"],
            "name": server["name"],
            "ip": server["public_net"]["ipv4"]["ip"],
            "status": server["status"]
        }
    
    async def delete_vm(self, server_id: int) -> bool:
        """Delete a VM"""
        try:
            await self._request("DELETE", f"/servers/{server_id}")
            return True
        except:
            return False
    
    async def list_vms(self, label_selector: str = "service=butlr") -> list:
        """List all Butlr VMs"""
        result = await self._request("GET", f"/servers?label_selector={label_selector}")
        
        servers = []
        for server in result.get("servers", []):
            servers.append({
                "id": server["id"],
                "name": server["name"],
                "ip": server["public_net"]["ipv4"]["ip"],
                "status": server["status"]
            })
        
        return servers
    
    def _get_cloud_init(self) -> str:
        """Cloud-init script for VM setup with security hardening"""
        return '''#cloud-config
package_update: true
package_upgrade: true

packages:
  - curl
  - git
  - jq
  - unzip
  - fail2ban
  - ufw

runcmd:
  # ================================
  # SECURITY HARDENING
  # ================================

  # Disable password authentication (SSH key only)
  - sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
  - sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
  - sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
  - sed -i 's/PermitRootLogin yes/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
  - sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config
  - sed -i 's/ChallengeResponseAuthentication yes/ChallengeResponseAuthentication no/' /etc/ssh/sshd_config
  - sed -i 's/#MaxAuthTries 6/MaxAuthTries 3/' /etc/ssh/sshd_config
  - systemctl restart sshd

  # Configure fail2ban for SSH protection
  - |
    cat > /etc/fail2ban/jail.local << 'EOF'
    [DEFAULT]
    bantime = 1h
    findtime = 10m
    maxretry = 3

    [sshd]
    enabled = true
    port = ssh
    filter = sshd
    logpath = /var/log/auth.log
    maxretry = 3
    bantime = 3600
    EOF
  - systemctl enable fail2ban
  - systemctl start fail2ban

  # Setup UFW firewall
  - ufw default deny incoming
  - ufw default allow outgoing
  - ufw allow 22/tcp comment 'SSH'
  - ufw allow 80/tcp comment 'HTTP'
  - ufw allow 443/tcp comment 'HTTPS'
  - ufw --force enable

  # Disable unused services
  - systemctl disable bluetooth.service 2>/dev/null || true
  - systemctl disable cups.service 2>/dev/null || true

  # ================================
  # APPLICATION SETUP
  # ================================

  # Install Node.js 22
  - curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  - apt-get install -y nodejs

  # Install npm packages
  - npm install -g clawdbot pm2

  # Create workspace
  - mkdir -p /root/butlr-workspace
  - mkdir -p /root/butlr-workspace/skills/support

  # Install support skill (survives soul changes)
  - |
    cat > /root/butlr-workspace/skills/support/SKILL.md << 'EOFSKILL'
    ---
    name: support
    description: Contact Butlr support team. Usage: /support your message here
    user-invocable: true
    metadata: {"clawdbot":{"emoji":"🆘"}}
    ---
    # Support Command
    When the user sends /support followed by a message, forward it to the Butlr support team.
    1. Extract the user message (everything after /support)
    2. If empty, reply: "Please include a message: /support <your message>"
    3. Get bot username from IDENTITY.md, user info from inbound metadata
    4. Run: curl -s -X POST https://butlr.cloud/api/support/from-bot -H "Content-Type: application/json" -d '{"message": "USER_MSG", "category": "general", "bot_username": "BOT_NAME", "user_telegram_id": "USER_ID", "user_telegram_username": "USERNAME"}'
    5. If success, confirm to user. If fail, suggest email support@butlr.cloud
    EOFSKILL

  # ================================
  # AUTOMATIC SECURITY UPDATES
  # ================================
  - apt-get install -y unattended-upgrades
  - dpkg-reconfigure -f noninteractive unattended-upgrades

  # Signal ready
  - touch /root/.butlr-ready
'''

    async def wait_for_vm_ready(self, server_id: int, timeout: int = 300) -> bool:
        """Wait for VM to be running and cloud-init complete"""
        import asyncio
        
        start_time = asyncio.get_event_loop().time()
        
        while True:
            elapsed = asyncio.get_event_loop().time() - start_time
            if elapsed > timeout:
                return False
            
            vm = await self.get_vm(server_id)
            if vm and vm["status"] == "running":
                # Check if cloud-init is done (via SSH)
                # For now, just wait a bit after running status
                await asyncio.sleep(30)
                return True
            
            await asyncio.sleep(5)

    async def delete_vm_by_ip(self, ip: str) -> bool:
        """Delete a VM by its IP address"""
        try:
            result = await self._request("GET", "/servers")
            for server in result.get("servers", []):
                server_ip = server.get("public_net", {}).get("ipv4", {}).get("ip", "")
                if server_ip == ip:
                    return await self.delete_vm(server["id"])
            print(f"VM with IP {ip} not found in Hetzner")
            return False
        except Exception as e:
            print(f"delete_vm_by_ip error: {e}")
            return False
