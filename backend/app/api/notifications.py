import asyncio
import logging
from typing import Dict, List
from fastapi import APIRouter, Request, Header, HTTPException
from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notifications", tags=["Notifications"])

# Dictionary to hold user connections
# Mapping: user_id -> List of asyncio.Queue
active_connections: Dict[str, List[asyncio.Queue]] = {}

async def send_notification(user_id: str, message: dict):
    """Utility function to send a notification to a specific user's connected clients."""
    if user_id in active_connections:
        for queue in active_connections[user_id]:
            await queue.put(message)

from fastapi import APIRouter, Request, Header, HTTPException, Query

@router.get("/stream")
async def notification_stream(request: Request, x_user_id: str = Query(None, alias="x_user_id"), header_user_id: str = Header(None, alias="x-user-id")):
    user_id = x_user_id or header_user_id
    if not user_id:
        raise HTTPException(status_code=401, detail="x_user_id query param or X-User-Id header required")

    # Create a new queue for this client connection
    client_queue = asyncio.Queue()
    
    if user_id not in active_connections:
        active_connections[user_id] = []
    active_connections[user_id].append(client_queue)

    async def event_generator():
        try:
            while True:
                # If client disconnected, break
                if await request.is_disconnected():
                    break
                    
                # Wait for a new message
                try:
                    message = await asyncio.wait_for(client_queue.get(), timeout=15.0)
                    import json
                    yield f"data: {json.dumps(message)}\n\n"
                except asyncio.TimeoutError:
                    # Send a ping/keepalive
                    yield ": keepalive\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            if user_id in active_connections:
                if client_queue in active_connections[user_id]:
                    active_connections[user_id].remove(client_queue)
                if not active_connections[user_id]:
                    del active_connections[user_id]
            logger.info(f"SSE Client disconnected for user {user_id}")



    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no"
    }
    return StreamingResponse(event_generator(), media_type="text/event-stream", headers=headers)
