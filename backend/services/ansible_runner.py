"""Ansible Runner Service for Butlr"""
import subprocess
import os
import yaml
import tempfile
from pathlib import Path
from typing import Optional, Dict, Any, List
import asyncio

class AnsibleRunner:
    """Service for running Ansible playbooks programmatically"""
    
    def __init__(self, ansible_dir: Optional[str] = None):
        if ansible_dir:
            self.ansible_dir = Path(ansible_dir)
        else:
            # Default: ansible directory relative to this file
            self.ansible_dir = Path(__file__).parent.parent.parent / "ansible"
        
        self.inventory_file = self.ansible_dir / "inventory" / "hosts.yml"
        
    async def add_host_to_inventory(
        self,
        hostname: str,
        ip_address: str,
        customer_id: int,
        telegram_token: str,
        owner_telegram_id: str,
        **extra_vars
    ) -> bool:
        """Add a new host to the inventory file"""
        try:
            # Load existing inventory
            if self.inventory_file.exists():
                with open(self.inventory_file, 'r') as f:
                    inventory = yaml.safe_load(f) or {}
            else:
                inventory = {}
            
            # Ensure structure exists
            if 'all' not in inventory:
                inventory['all'] = {'children': {}}
            if 'children' not in inventory['all']:
                inventory['all']['children'] = {}
            if 'butlr_vms' not in inventory['all']['children']:
                inventory['all']['children']['butlr_vms'] = {'hosts': {}, 'vars': {}}
            if 'hosts' not in inventory['all']['children']['butlr_vms']:
                inventory['all']['children']['butlr_vms']['hosts'] = {}
            
            # Add host
            inventory['all']['children']['butlr_vms']['hosts'][hostname] = {
                'ansible_host': ip_address,
                'customer_id': customer_id,
                'telegram_token': telegram_token,
                'owner_telegram_id': owner_telegram_id,
                **extra_vars
            }
            
            # Write back
            with open(self.inventory_file, 'w') as f:
                yaml.dump(inventory, f, default_flow_style=False)
            
            return True
        except Exception as e:
            print(f"Error adding host to inventory: {e}")
            return False
    
    async def remove_host_from_inventory(self, hostname: str) -> bool:
        """Remove a host from the inventory"""
        try:
            if not self.inventory_file.exists():
                return True
            
            with open(self.inventory_file, 'r') as f:
                inventory = yaml.safe_load(f) or {}
            
            hosts = inventory.get('all', {}).get('children', {}).get('butlr_vms', {}).get('hosts', {})
            if hostname in hosts:
                del hosts[hostname]
            
            with open(self.inventory_file, 'w') as f:
                yaml.dump(inventory, f, default_flow_style=False)
            
            return True
        except Exception as e:
            print(f"Error removing host from inventory: {e}")
            return False
    
    async def run_playbook(
        self,
        playbook: str,
        extra_vars: Optional[Dict[str, Any]] = None,
        limit: Optional[str] = None,
        check_mode: bool = False,
    ) -> Dict[str, Any]:
        """
        Run an Ansible playbook
        
        Args:
            playbook: Playbook name (e.g., 'setup_vm.yml')
            extra_vars: Extra variables to pass
            limit: Limit to specific hosts
            check_mode: Dry run
            
        Returns:
            Dict with success status and output
        """
        playbook_path = self.ansible_dir / "playbooks" / playbook
        
        if not playbook_path.exists():
            return {
                "success": False,
                "error": f"Playbook not found: {playbook}",
                "output": ""
            }
        
        cmd = [
            "ansible-playbook",
            str(playbook_path),
        ]
        
        if extra_vars:
            # Write extra vars to temp file for security
            with tempfile.NamedTemporaryFile(mode='w', suffix='.yml', delete=False) as f:
                yaml.dump(extra_vars, f)
                cmd.extend(['-e', f'@{f.name}'])
        
        if limit:
            cmd.extend(['--limit', limit])
        
        if check_mode:
            cmd.append('--check')
        
        try:
            result = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=str(self.ansible_dir),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
            )
            
            stdout, _ = await result.communicate()
            output = stdout.decode('utf-8')
            
            return {
                "success": result.returncode == 0,
                "return_code": result.returncode,
                "output": output
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "output": ""
            }
    
    async def setup_vm(self, hostname: str) -> Dict[str, Any]:
        """Run the VM setup playbook"""
        return await self.run_playbook(
            "setup_vm.yml",
            extra_vars={"target_host": hostname},
            limit=hostname
        )
    
    async def configure_clawdbot(
        self,
        hostname: str,
        telegram_token: str,
        owner_id: str,
        customer_id: int,
        anthropic_api_key: str,
    ) -> Dict[str, Any]:
        """Configure Clawdbot for a customer"""
        return await self.run_playbook(
            "configure_clawdbot.yml",
            extra_vars={
                "target_host": hostname,
                "telegram_token": telegram_token,
                "owner_id": owner_id,
                "customer_id": customer_id,
                "anthropic_api_key": anthropic_api_key,
            },
            limit=hostname
        )
    
    async def health_check(self, hostname: Optional[str] = None) -> Dict[str, Any]:
        """Run health check"""
        return await self.run_playbook(
            "health_check.yml",
            limit=hostname
        )
    
    async def update_vms(self, hostname: Optional[str] = None) -> Dict[str, Any]:
        """Update VMs"""
        return await self.run_playbook(
            "update_vms.yml",
            limit=hostname
        )
