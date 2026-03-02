#!/usr/bin/env python3
"""Admin Dashboard - Quick Overview of Butlr System"""
import asyncio
import httpx
from datetime import datetime
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import box

console = Console()

async def get_health_data():
    """Get health data from API"""
    async with httpx.AsyncClient() as client:
        response = await client.get("http://localhost:8000/api/health/")
        return response.json()

async def get_usage_data():
    """Get usage data from API"""
    async with httpx.AsyncClient() as client:
        response = await client.get("http://localhost:8000/api/usage/")
        return response.json()

async def main():
    """Display admin dashboard"""
    console.clear()
    
    # Header
    console.print(Panel.fit(
        "[bold cyan]Butlr Admin Dashboard[/bold cyan]\n"
        f"[dim]{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC[/dim]",
        box=box.DOUBLE
    ))
    
    # Get data
    health = await get_health_data()
    usage = await get_usage_data()
    
    # Summary Stats
    summary_table = Table(show_header=False, box=None)
    summary_table.add_column("Metric", style="cyan")
    summary_table.add_column("Value", style="bold")
    
    summary_table.add_row("Total Customers", str(usage['summary']['total_customers']))
    summary_table.add_row("Active Customers", str(usage['summary']['active_customers']))
    summary_table.add_row("Healthy VMs", f"{health['summary']['healthy_vms']}/{health['summary']['total_vms']}")
    summary_table.add_row("MRR", f"${usage['summary']['revenue_mrr']}")
    
    console.print(Panel(summary_table, title="[bold]Summary[/bold]", box=box.ROUNDED))
    
    # VM Health Table
    vm_table = Table(title="VM Health Status", box=box.ROUNDED)
    vm_table.add_column("Customer", style="cyan")
    vm_table.add_column("Bot", style="yellow")
    vm_table.add_column("VM", justify="center")
    vm_table.add_column("Clawdbot", justify="center")
    vm_table.add_column("CPU%", justify="right")
    vm_table.add_column("Memory%", justify="right")
    
    for vm in health['vms']:
        vm_status = "🟢" if vm['health']['vm_reachable'] else "🔴"
        bot_status = "🟢" if vm['health']['clawdbot_running'] else "🔴"
        
        vm_table.add_row(
            vm['customer_email'],
            f"@{vm['bot_username']}",
            vm_status,
            bot_status,
            f"{vm['health']['cpu_usage']:.1f}",
            f"{vm['health']['memory_usage']:.1f}"
        )
    
    console.print("\n")
    console.print(vm_table)
    
    # Usage Table
    usage_table = Table(title="Customer Usage", box=box.ROUNDED)
    usage_table.add_column("Customer", style="cyan")
    usage_table.add_column("Status", justify="center")
    usage_table.add_column("Messages Today", justify="right")
    usage_table.add_column("Created", style="dim")
    
    for customer in usage['customers']:
        status_color = "green" if customer['status'] == 'active' else "yellow"
        created = datetime.fromisoformat(customer['created_at']).strftime('%Y-%m-%d')
        
        usage_table.add_row(
            customer['customer_email'],
            f"[{status_color}]{customer['status']}[/{status_color}]",
            str(customer['usage']['messages_today']),
            created
        )
    
    console.print("\n")
    console.print(usage_table)
    
    # API Endpoints
    endpoints_panel = Panel(
        "[bold]New API Endpoints:[/bold]\n\n"
        "[cyan]Health Monitoring:[/cyan]\n"
        "  GET /api/health/ - All VMs health\n"
        "  GET /api/health/{customer_id} - Single VM health\n"
        "  POST /api/health/alert-unhealthy - Send alerts\n\n"
        "[cyan]Usage Analytics:[/cyan]\n"
        "  GET /api/usage/ - All usage stats\n"
        "  GET /api/usage/customer/{id} - Customer usage\n"
        "  GET /api/usage/trends - Usage trends\n\n"
        "[cyan]Email Service:[/cyan]\n"
        "  ✅ Welcome email on signup\n"
        "  ✅ Payment failed notifications\n"
        "  ✅ VM error alerts\n"
        "  ✅ Subscription cancelled emails",
        title="[bold]Features Status[/bold]",
        box=box.ROUNDED
    )
    
    console.print("\n")
    console.print(endpoints_panel)
    
    # Footer
    console.print("\n")
    console.print(Panel.fit(
        "[dim]Refresh: python admin_dashboard.py[/dim]",
        box=box.SINGLE
    ))

if __name__ == "__main__":
    asyncio.run(main())