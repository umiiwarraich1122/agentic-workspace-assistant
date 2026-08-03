import os
import json
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from livekit import api

router = APIRouter(prefix="/api/livekit", tags=["LiveKit"])

class TokenRequest(BaseModel):
    user_id: str
    access_token: str

@router.post("/token")
async def generate_token(request: TokenRequest):
    """
    Generates a LiveKit connection token for the frontend.
    Passes user_id and access_token in the metadata so the LiveKit Agent can read it.
    """
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")
    
    if not api_key or not api_secret:
        raise HTTPException(status_code=500, detail="LIVEKIT_API_KEY or LIVEKIT_API_SECRET not configured on the backend.")

    # We use a static room name for this user, e.g., 'room-<user_id>'
    room_name = f"room-{request.user_id}"
    participant_identity = f"user-{request.user_id}"

    metadata = json.dumps({
        "user_id": request.user_id,
        "access_token": request.access_token
    })

    token = api.AccessToken(api_key, api_secret) \
        .with_identity(participant_identity) \
        .with_name(participant_identity) \
        .with_grants(api.VideoGrants(
            room_join=True,
            room=room_name,
        )) \
        .with_metadata(metadata)

    return {"token": token.to_jwt()}
