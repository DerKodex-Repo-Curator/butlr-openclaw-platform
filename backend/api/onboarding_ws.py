"""WebSocket endpoint for onboarding log streaming"""
import asyncio
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json

router = APIRouter()

# Store active WebSocket connections per customer
connections: Dict[int, Set[WebSocket]] = {}

# Log buffer for late-connecting clients
log_buffer: Dict[int, list] = {}
MAX_BUFFER_SIZE = 100


async def broadcast_log(customer_id: int, level: str, message: str, step: str = None):
    """Broadcast a log message to all connected clients for a customer"""
    log_entry = {
        "type": "log",
        "level": level,
        "message": message,
        "step": step
    }

    # Add to buffer
    if customer_id not in log_buffer:
        log_buffer[customer_id] = []
    log_buffer[customer_id].append(log_entry)

    # Trim buffer if too large
    if len(log_buffer[customer_id]) > MAX_BUFFER_SIZE:
        log_buffer[customer_id] = log_buffer[customer_id][-MAX_BUFFER_SIZE:]

    # Broadcast to connected clients
    if customer_id in connections:
        disconnected = set()
        for ws in connections[customer_id]:
            try:
                await ws.send_json(log_entry)
            except Exception:
                disconnected.add(ws)

        # Remove disconnected clients
        connections[customer_id] -= disconnected


def clear_logs(customer_id: int):
    """Clear log buffer for a customer"""
    if customer_id in log_buffer:
        del log_buffer[customer_id]


@router.websocket("/ws/onboarding/{customer_id}")
async def websocket_onboarding(websocket: WebSocket, customer_id: int):
    """WebSocket endpoint for streaming onboarding logs"""
    await websocket.accept()

    # Register connection
    if customer_id not in connections:
        connections[customer_id] = set()
    connections[customer_id].add(websocket)

    try:
        # Send buffered logs to new client
        if customer_id in log_buffer:
            for log in log_buffer[customer_id]:
                await websocket.send_json(log)

        # Keep connection alive
        while True:
            try:
                # Wait for any message (ping/pong or disconnect)
                await asyncio.wait_for(websocket.receive_text(), timeout=30)
            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                try:
                    await websocket.send_json({"type": "ping"})
                except Exception:
                    break
    except WebSocketDisconnect:
        pass
    finally:
        # Unregister connection
        if customer_id in connections:
            connections[customer_id].discard(websocket)
            if not connections[customer_id]:
                del connections[customer_id]


# Helper functions for the provisioning process
async def log_info(customer_id: int, message: str, step: str = None):
    """Log an info message"""
    await broadcast_log(customer_id, "info", message, step)


async def log_success(customer_id: int, message: str, step: str = None):
    """Log a success message"""
    await broadcast_log(customer_id, "success", message, step)


async def log_warn(customer_id: int, message: str, step: str = None):
    """Log a warning message"""
    await broadcast_log(customer_id, "warn", message, step)


async def log_error(customer_id: int, message: str, step: str = None):
    """Log an error message"""
    await broadcast_log(customer_id, "error", message, step)
