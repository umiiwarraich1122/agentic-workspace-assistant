from fastapi import APIRouter, HTTPException, BackgroundTasks, Request, Depends
from pydantic import BaseModel
import httpx
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])

EVOLUTION_API_URL = "http://evolution-api:8080"
GLOBAL_API_KEY = "jarvis_secure_key_123"

class SendMessageRequest(BaseModel):
    number: str
    message: str

@router.post("/connect")
async def connect_whatsapp():
    """Creates an instance and returns the base64 QR code to scan"""
    instance_name = "jarvis_instance"
    headers = {"apikey": GLOBAL_API_KEY}
    
    async with httpx.AsyncClient() as client:
        # First, try to fetch existing instance
        try:
            state_resp = await client.get(f"{EVOLUTION_API_URL}/instance/connectionState/{instance_name}", headers=headers, timeout=5.0)
            if state_resp.status_code == 200:
                data = state_resp.json()
                if data.get("instance", {}).get("state") == "open":
                    return {"status": "connected", "message": "Already connected to WhatsApp"}
        except Exception as e:
            logger.error(f"Error checking instance state: {e}")

        # If not connected, create or fetch QR
        payload = {
            "instanceName": instance_name,
            "token": "jarvis_secure_token",
            "qrcode": True,
            "integration": "WHATSAPP-BAILEYS",
            "webhook": {
                "enabled": True,
                "url": "http://backend-api:8000/api/whatsapp/webhook",
                "byEvents": False,
                "base64": False,
                "events": ["MESSAGES_UPSERT"]
            }
        }
        try:
            resp = await client.post(f"{EVOLUTION_API_URL}/instance/create", json=payload, headers=headers, timeout=10.0)
            if resp.status_code in [200, 201]:
                return {"status": "qr_generated", "data": resp.json()}
            
            logger.error(f"Failed to create instance. Status: {resp.status_code}, Body: {resp.text}")
            
            # If instance already exists, just connect to get QR
            connect_resp = await client.get(f"{EVOLUTION_API_URL}/instance/connect/{instance_name}", headers=headers, timeout=10.0)
            if connect_resp.status_code == 200:
                return {"status": "qr_generated", "data": connect_resp.json()}
                
            raise HTTPException(status_code=400, detail=f"Failed to generate QR code: {resp.text}")
        except Exception as e:
            logger.error(f"Exception during create: {e}")
            raise HTTPException(status_code=500, detail=str(e))

import json
import os

DB_FILE = "/app/whatsapp_db.json"

def get_messages():
    if not os.path.exists(DB_FILE):
        return []
    with open(DB_FILE, "r") as f:
        try:
            return json.load(f)
        except:
            return []

def save_message(msg):
    messages = get_messages()
    messages.append(msg)
    with open(DB_FILE, "w") as f:
        json.dump(messages, f)

@router.get("/chats")
async def fetch_chats():
    """Fetch active chats from Evolution API"""
    instance_name = "jarvis_instance"
    headers = {"apikey": GLOBAL_API_KEY}
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(f"{EVOLUTION_API_URL}/chat/findChats/{instance_name}", headers=headers, timeout=10.0)
            if resp.status_code == 200:
                return resp.json()
            return []
        except Exception as e:
            logger.error(f"Error fetching chats: {e}")
            return []

@router.get("/messages")
async def fetch_messages(jid: Optional[str] = None):
    """Fetch messages from local cache, filtered by JID"""
    messages = get_messages()
    if jid:
        messages = [m for m in messages if m.get("remote_jid") == jid]
    return messages

@router.post("/webhook")
async def whatsapp_webhook(request: Request):
    """Receives incoming messages from Evolution API"""
    try:
        data = await request.json()
        logger.info(f"WhatsApp Webhook received")
        
        # Evolution API webhook structure
        if data.get("event") == "messages.upsert":
            for msg in data.get("data", {}).get("messages", []):
                # Extract text
                text = msg.get("message", {}).get("conversation", "")
                if not text:
                    text = msg.get("message", {}).get("extendedTextMessage", {}).get("text", "")
                
                new_msg = {
                    "id": msg.get("key", {}).get("id"),
                    "remote_jid": msg.get("key", {}).get("remoteJid"),
                    "push_name": msg.get("pushName", "Unknown"),
                    "message_content": text,
                    "is_from_me": msg.get("key", {}).get("fromMe", False),
                    "timestamp": msg.get("messageTimestamp", 0)
                }
                save_message(new_msg)
            
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}

@router.post("/send")
async def send_message(req: SendMessageRequest):
    """Sends a WhatsApp message via Evolution API"""
    instance_name = "jarvis_instance"
    headers = {"apikey": GLOBAL_API_KEY}
    payload = {
        "number": req.number,
        "options": {
            "delay": 1200,
            "presence": "composing"
        },
        "textMessage": {
            "text": req.message
        }
    }
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{EVOLUTION_API_URL}/message/sendText/{instance_name}",
                json=payload,
                headers=headers,
                timeout=10.0
            )
            resp.raise_for_status()
            return {"status": "sent", "data": resp.json()}
        except Exception as e:
            logger.error(f"Failed to send message: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to send WhatsApp message: {e}")
@router.delete("/logout")
async def logout_whatsapp():
    """Logs out and deletes the WhatsApp instance"""
    instance_name = "jarvis_instance"
    headers = {"apikey": GLOBAL_API_KEY}
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.delete(f"{EVOLUTION_API_URL}/instance/logout/{instance_name}", headers=headers, timeout=10.0)
            await client.delete(f"{EVOLUTION_API_URL}/instance/delete/{instance_name}", headers=headers, timeout=10.0)
            return {"status": "logged_out"}
        except Exception as e:
            logger.error(f"Error logging out: {e}")
            return {"status": "error"}
