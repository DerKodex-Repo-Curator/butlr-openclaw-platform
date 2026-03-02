"""VM Management API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List

from models.database import get_db
from models.customer import Customer, CustomerStatus
from models.vm import VM
from services.hetzner import HetznerService

router = APIRouter()

# Pydantic schemas
class VMCreate(BaseModel):
    customer_id: int
    server_type: str = "cx22"
    location: str = "nbg1"

class VMResponse(BaseModel):
    id: int
    hetzner_id: str
    name: str
    ip_address: Optional[str]
    status: str
    server_type: str
    location: str
    customer_id: int
    clawdbot_status: str

    class Config:
        from_attributes = True

class VMStatusResponse(BaseModel):
    status: str
    ip_address: Optional[str]
    clawdbot_status: str

# Initialize Hetzner service
def get_hetzner() -> HetznerService:
    return HetznerService()

# Endpoints
@router.get("/", response_model=List[VMResponse])
async def list_vms(
    db: AsyncSession = Depends(get_db)
):
    """List all VMs (admin only)"""
    result = await db.execute(select(VM))
    vms = result.scalars().all()
    return vms

@router.get("/{vm_id}", response_model=VMResponse)
async def get_vm(
    vm_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get VM details"""
    result = await db.execute(
        select(VM).where(VM.id == vm_id)
    )
    vm = result.scalar_one_or_none()
    if not vm:
        raise HTTPException(status_code=404, detail="VM not found")
    return vm

@router.post("/", response_model=VMResponse)
async def create_vm(
    data: VMCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    hetzner: HetznerService = Depends(get_hetzner)
):
    """Create a new VM for a customer"""
    # Get customer
    result = await db.execute(
        select(Customer).where(Customer.id == data.customer_id)
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Check if customer already has a VM
    if customer.vm_id:
        raise HTTPException(status_code=400, detail="Customer already has a VM")
    
    # Create VM
    vm_name = f"butlr-{customer.id}"
    
    try:
        hetzner_vm = await hetzner.create_vm(
            name=vm_name,
            server_type=data.server_type,
            location=data.location,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create VM: {str(e)}")
    
    # Create VM record
    vm = VM(
        hetzner_id=str(hetzner_vm["id"]),
        name=vm_name,
        ip_address=hetzner_vm.get("ip_address"),
        server_type=data.server_type,
        location=data.location,
        customer_id=customer.id,
        status="creating",
    )
    db.add(vm)
    
    # Update customer
    customer.vm_id = str(hetzner_vm["id"])
    customer.vm_ip = hetzner_vm.get("ip_address")
    customer.vm_status = "creating"
    
    await db.commit()
    await db.refresh(vm)
    
    # TODO: Background task to setup Clawdbot
    # background_tasks.add_task(setup_clawdbot, vm.id, hetzner_vm)
    
    return vm

@router.get("/{vm_id}/status", response_model=VMStatusResponse)
async def get_vm_status(
    vm_id: int,
    db: AsyncSession = Depends(get_db),
    hetzner: HetznerService = Depends(get_hetzner)
):
    """Get VM status from Hetzner"""
    result = await db.execute(
        select(VM).where(VM.id == vm_id)
    )
    vm = result.scalar_one_or_none()
    if not vm:
        raise HTTPException(status_code=404, detail="VM not found")
    
    # Get live status from Hetzner
    hetzner_status = await hetzner.get_vm_status(int(vm.hetzner_id))
    
    return VMStatusResponse(
        status=hetzner_status or vm.status,
        ip_address=vm.ip_address,
        clawdbot_status=vm.clawdbot_status
    )

@router.post("/{vm_id}/reboot")
async def reboot_vm(
    vm_id: int,
    db: AsyncSession = Depends(get_db),
    hetzner: HetznerService = Depends(get_hetzner)
):
    """Reboot a VM"""
    result = await db.execute(
        select(VM).where(VM.id == vm_id)
    )
    vm = result.scalar_one_or_none()
    if not vm:
        raise HTTPException(status_code=404, detail="VM not found")
    
    success = await hetzner.reboot_vm(int(vm.hetzner_id))
    if not success:
        raise HTTPException(status_code=500, detail="Failed to reboot VM")
    
    return {"status": "rebooting"}

@router.delete("/{vm_id}")
async def delete_vm(
    vm_id: int,
    db: AsyncSession = Depends(get_db),
    hetzner: HetznerService = Depends(get_hetzner)
):
    """Delete a VM"""
    result = await db.execute(
        select(VM).where(VM.id == vm_id)
    )
    vm = result.scalar_one_or_none()
    if not vm:
        raise HTTPException(status_code=404, detail="VM not found")
    
    # Delete from Hetzner
    success = await hetzner.delete_vm(int(vm.hetzner_id))
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete VM from Hetzner")
    
    # Update customer
    result = await db.execute(
        select(Customer).where(Customer.id == vm.customer_id)
    )
    customer = result.scalar_one_or_none()
    if customer:
        customer.vm_id = None
        customer.vm_ip = None
        customer.vm_status = "none"
    
    # Delete VM record
    vm.status = "deleted"
    await db.commit()
    
    return {"status": "deleted"}

@router.get("/customer/{customer_id}", response_model=Optional[VMResponse])
async def get_customer_vm(
    customer_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get VM for a specific customer"""
    result = await db.execute(
        select(VM).where(VM.customer_id == customer_id).where(VM.status != "deleted")
    )
    vm = result.scalar_one_or_none()
    return vm
