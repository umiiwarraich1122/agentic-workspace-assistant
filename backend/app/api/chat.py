from fastapi import APIRouter, HTTPException
from app.schemas.core import ChatRequest, ChatResponse
from app.agent.graph_agent import build_graph
from app.auth.token_manager import TokenManager
from app.database.supabase import get_supabase
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
import logging
import uuid
import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Agent Chat"])

def get_thread_state(thread_id: str):
    supabase = get_supabase()
    # Fetch messages for thread_id ordered by created_at
    response = supabase.table("conversations").select("*").eq("thread_id", thread_id).order("created_at").execute()
    
    messages = []
    for msg in response.data:
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            messages.append(AIMessage(content=msg["content"]))
        elif msg["role"] == "system":
            messages.append(SystemMessage(content=msg["content"]))
            
    return {"messages": messages}

def save_message_to_db(thread_id: str, user_id: str, role: str, content: str):
    supabase = get_supabase()
    supabase.table("conversations").insert({
        "thread_id": thread_id,
        "user_id": user_id,
        "role": role,
        "content": content
    }).execute()

@router.get("/threads")
async def get_threads(user_id: str):
    """Get all distinct threads for a user."""
    supabase = get_supabase()
    # Since Supabase PostgREST doesn't support SELECT DISTINCT easily on non-RPC, we fetch and group manually
    response = supabase.table("conversations").select("thread_id, content, created_at").eq("user_id", user_id).order("created_at", desc=True).execute()
    
    threads = {}
    # Extract the first message of each thread as a preview/summary
    for msg in response.data:
        tid = msg["thread_id"]
        if not tid: continue
        if tid not in threads:
            threads[tid] = {
                "id": tid,
                "preview": msg["content"][:60] + "...",
                "updated_at": msg["created_at"]
            }
            
    return {"threads": list(threads.values())}

@router.delete("/threads/{thread_id}")
async def delete_thread(thread_id: str):
    """Delete a specific chat thread permanently."""
    supabase = get_supabase()
    try:
        supabase.table("conversations").delete().eq("thread_id", thread_id).execute()
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error deleting thread: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete thread")

@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a message to the Jarvis AI Assistant."""
    logger.info(f"Incoming Request - User: {request.user_id}, Thread: {request.thread_id}")
    try:
        access_token = await TokenManager.get_access_token(request.user_id)
    except Exception as e:
        logger.error(f"Error fetching token: {str(e)}", exc_info=True)
        raise HTTPException(status_code=401, detail=f"Auth error: {str(e)}")

    # Generate a thread ID if one wasn't provided or is invalid
    thread_id = request.thread_id
    if not thread_id or thread_id == 'undefined':
        thread_id = str(uuid.uuid4())

    # Save user message to Supabase
    save_message_to_db(thread_id, request.user_id, "user", request.message)

    # Retrieve conversational state from Supabase
    thread_state = get_thread_state(thread_id)
    thread_state["user_id"] = request.user_id
    thread_state["access_token"] = access_token

    try:
        agent = build_graph(access_token, request.user_id, request.local_time, request.timezone)
        result = await agent.ainvoke(thread_state)
        
        final_message = result["messages"][-1].content
        # Save AI response to Supabase
        save_message_to_db(thread_id, request.user_id, "assistant", final_message)
        
        return ChatResponse(response=final_message)
        
    except Exception as e:
        import traceback
        error_msg = f"LangGraph Crash: {str(e)}\n{traceback.format_exc()}"
        logger.error(error_msg)
        with open("crash_log.txt", "w") as f:
            f.write(error_msg)
        raise HTTPException(status_code=500, detail=str(e))
