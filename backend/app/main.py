import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Jarvis AI Assistant API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",         # Vite dev server
        "http://localhost:3000",         # Local preview
        "https://mr-jarvis.tech",        # Production domain
        "https://www.mr-jarvis.tech",    # Production www
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "app": "Jarvis AI Assistant"}

from app.api import auth, emails, calendar, todos, chat, livekit_api, notifications, bridge, pantry, github

app.include_router(auth.router)
app.include_router(emails.router)
app.include_router(calendar.router)
app.include_router(todos.router)
app.include_router(chat.router)
app.include_router(livekit_api.router)
app.include_router(notifications.router)
app.include_router(bridge.router)
app.include_router(pantry.router)
app.include_router(github.router, prefix="/api/github", tags=["GitHub"])
