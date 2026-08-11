from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from app.schemas.core import ChatRequest, ChatResponse
from app.agent.graph_agent import build_graph
from app.auth.token_manager import TokenManager
from app.database.supabase import get_supabase
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
import logging
import uuid
import datetime
import json

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["Agent Chat"])

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

@router.get("/threads/{thread_id}")
async def get_thread_messages(thread_id: str):
    """Get all messages for a specific chat thread."""
    supabase = get_supabase()
    response = supabase.table("conversations").select("role, content, created_at").eq("thread_id", thread_id).order("created_at").execute()
    
    messages = []
    for msg in response.data:
        messages.append({
            "sender": "user" if msg["role"] == "user" else "ai",
            "content": msg["content"],
            "timestamp": msg["created_at"]
        })
    return {"messages": messages}

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

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
import PyPDF2
from io import BytesIO

@router.post("/upload")
async def upload_document(file: UploadFile = File(...), user_id: str = Form(...)):
    """Upload a document to inject into the AI context."""
    try:
        content = ""
        file_bytes = await file.read()
        
        if file.filename.endswith(".pdf"):
            pdf = PyPDF2.PdfReader(BytesIO(file_bytes))
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    content += text + "\n"
        else:
            content = file_bytes.decode("utf-8", errors="ignore")
            
        doc_id = str(uuid.uuid4())
        from app.rag.retriever import index_document
        index_document(doc_id, file.filename, content)
        
        return {"document_id": doc_id, "filename": file.filename}
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse document")

import base64
from langchain_groq import ChatGroq

@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...), user_id: str = Form(...)):
    """Upload an image, extract text using OCR (Groq Vision), and inject it into the AI context."""
    try:
        file_bytes = await file.read()
        b64_img = base64.b64encode(file_bytes).decode('utf-8')
        mime_type = file.content_type or "image/jpeg"
        
        # Use Groq Vision for OCR
        llm = ChatGroq(model="qwen/qwen3.6-27b", temperature=0)
        msg = HumanMessage(content=[
            {"type": "text", "text": "Extract ALL text from this image exactly as it appears. Return only the extracted text."},
            {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{b64_img}"}}
        ])
        
        res = llm.invoke([msg])
        extracted_text = res.content
        
        if not extracted_text.strip():
            extracted_text = "[No text found in image]"
            
        doc_id = str(uuid.uuid4())
        from app.rag.retriever import index_document
        index_document(doc_id, file.filename, extracted_text)
        
        return {
            "document_id": doc_id, 
            "filename": file.filename,
            "ocr_text": extracted_text[:200] + ("..." if len(extracted_text) > 200 else "")
        }
    except Exception as e:
        logger.error(f"Error processing image OCR: {e}")
        raise HTTPException(status_code=500, detail="Failed to process image")


@router.post("")
async def chat(request: ChatRequest):
    """Send a message to the Jarvis AI Assistant (Streaming SSE)."""
    logger.info(f"Incoming Request - User: {request.user_id}, Thread: {request.thread_id}")
    try:
        access_token = await TokenManager.get_access_token(request.user_id)
    except Exception as e:
        logger.error(f"Error fetching token: {str(e)}", exc_info=True)
        raise HTTPException(status_code=401, detail=f"Auth error: {str(e)}")

    thread_id = request.thread_id
    if not thread_id or thread_id == 'undefined':
        thread_id = str(uuid.uuid4())

    save_message_to_db(thread_id, request.user_id, "user", request.message)

    thread_state = get_thread_state(thread_id)
    thread_state["user_id"] = request.user_id
    thread_state["access_token"] = access_token

    if request.attached_document_id:
        from app.services.memory_store import store
        doc = store.get_document(request.attached_document_id)
        if doc and thread_state["messages"] and isinstance(thread_state["messages"][-1], HumanMessage):
            original_content = thread_state["messages"][-1].content
            
            is_image = any(doc['filename'].lower().endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.webp', '.gif'])
            file_type_desc = "an image" if is_image else "a document"
            
            injected_content = f"[System Notice: The user has attached {file_type_desc} named '{doc['filename']}'. To query its contents, you MUST use the document_search tool with document_id: {request.attached_document_id}]\n\nUser Message:\n{original_content}"
            thread_state["messages"][-1].content = injected_content

    async def event_generator():
        try:
            agent = build_graph(access_token, request.user_id, request.local_time, request.timezone)
            final_message = ""
            
            async for chunk in agent.astream(
                thread_state, 
                config={"configurable": {"user_id": request.user_id}}
            ):
                for node_name, node_state in chunk.items():
                    messages = node_state.get("messages", [])
                    if not messages:
                        continue
                    
                    last_msg = messages[-1]
                    
                    if node_name == "agent":
                        if hasattr(last_msg, "tool_calls") and last_msg.tool_calls:
                            for tc in last_msg.tool_calls:
                                payload = json.dumps({"type": "tool_start", "tool": tc.get("name", "")})
                                yield f"data: {payload}\n\n"
                        elif hasattr(last_msg, "content"):
                            final_message = last_msg.content if last_msg.content else "Action completed."
                            
            if final_message is not None and final_message != "":
                save_message_to_db(thread_id, request.user_id, "assistant", final_message)
                payload = json.dumps({"type": "final", "content": final_message})
                yield f"data: {payload}\n\n"
            elif final_message == "":
                fallback = "Directive executed."
                save_message_to_db(thread_id, request.user_id, "assistant", fallback)
                payload = json.dumps({"type": "final", "content": fallback})
                yield f"data: {payload}\n\n"
                
        except Exception as e:
            import traceback
            logger.error(f"LangGraph Crash: {str(e)}\n{traceback.format_exc()}")
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
