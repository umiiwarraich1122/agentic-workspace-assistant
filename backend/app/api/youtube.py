import os
import json
import logging
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/youtube", tags=["youtube"])

STATE_FILE = "/app/shared/youtube_state.json" if os.environ.get("DOCKER_ENV") else "youtube_state.json"

class PlayerState(BaseModel):
    video_id: Optional[str] = None
    title: Optional[str] = None
    thumbnail: Optional[str] = None
    playing: bool = False
    action_id: int = 0

def get_state() -> dict:
    if not os.path.exists(STATE_FILE):
        return {"video_id": None, "title": None, "thumbnail": None, "playing": False, "action_id": 0}
    try:
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error reading youtube state: {e}")
        return {"video_id": None, "title": None, "thumbnail": None, "playing": False, "action_id": 0}

def save_state(state: dict):
    try:
        with open(STATE_FILE, "w") as f:
            json.dump(state, f)
    except Exception as e:
        logger.error(f"Error writing youtube state: {e}")

@router.get("/status")
async def get_status():
    """Returns current playing song state"""
    return get_state()

@router.post("/update")
async def update_status(new_state: PlayerState):
    """Updates the state (usually called by frontend to report ending or by UI buttons)"""
    state = get_state()
    if new_state.video_id is not None:
        state["video_id"] = new_state.video_id
    if new_state.title is not None:
        state["title"] = new_state.title
    if new_state.thumbnail is not None:
        state["thumbnail"] = new_state.thumbnail
    state["playing"] = new_state.playing
    state["action_id"] += 1
    save_state(state)
    return state
