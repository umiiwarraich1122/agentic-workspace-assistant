import asyncio
import json
import logging
import uuid
from typing import Dict
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bridge", tags=["PC Bridge"])

class ConnectionManager:
    def __init__(self):
        # user_id -> websocket
        self.active_connections: Dict[str, WebSocket] = {}
        # correlation_id -> asyncio.Future (to wait for responses from the client)
        self.pending_responses: Dict[str, asyncio.Future] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info(f"Local PC Bridge connected for user: {user_id}")

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            logger.info(f"Local PC Bridge disconnected for user: {user_id}")
            
    def has_connection(self, user_id: str) -> bool:
        return user_id in self.active_connections

    async def send_command(self, user_id: str, action: str, payload: dict, timeout: float = 15.0) -> dict:
        if user_id not in self.active_connections:
            return {"status": "error", "message": "No active PC bridge connection found."}
            
        websocket = self.active_connections[user_id]
        correlation_id = str(uuid.uuid4())
        
        message = {
            "action": action,
            "correlation_id": correlation_id,
            "payload": payload
        }
        
        loop = asyncio.get_running_loop()
        future = loop.create_future()
        self.pending_responses[correlation_id] = future
        
        try:
            await websocket.send_text(json.dumps(message))
            # Wait for response from the client
            response = await asyncio.wait_for(future, timeout=timeout)
            return response
        except asyncio.TimeoutError:
            return {"status": "error", "message": f"Timeout waiting for response from PC bridge after {timeout} seconds."}
        except Exception as e:
            return {"status": "error", "message": f"Error communicating with PC bridge: {e}"}
        finally:
            if correlation_id in self.pending_responses:
                del self.pending_responses[correlation_id]

    async def handle_client_message(self, text_data: str):
        try:
            data = json.loads(text_data)
            correlation_id = data.get("correlation_id")
            if correlation_id and correlation_id in self.pending_responses:
                future = self.pending_responses[correlation_id]
                if not future.done():
                    future.set_result(data)
            else:
                logger.warning(f"Received unmatched bridge message: {data}")
        except Exception as e:
            logger.error(f"Error handling bridge message: {e}")

bridge_manager = ConnectionManager()

@router.websocket("/ws/{user_id}")
async def bridge_websocket(websocket: WebSocket, user_id: str):
    await bridge_manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            await bridge_manager.handle_client_message(data)
    except WebSocketDisconnect:
        bridge_manager.disconnect(user_id)
    except Exception as e:
        logger.error(f"Bridge WebSocket error for {user_id}: {e}")
        bridge_manager.disconnect(user_id)
