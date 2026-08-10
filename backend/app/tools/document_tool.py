import logging
import json
from langchain_core.tools import tool
from app.rag.retriever import retrieve

logger = logging.getLogger(__name__)

@tool
async def document_search(query: str, document_id: str) -> str:
    """
    Search an uploaded document for information related to the query.
    Returns the most relevant text chunks from the document.
    """
    if not document_id:
        return json.dumps({"success": False, "data": None, "error": "document_id is required."})
        
    try:
        docs = retrieve(document_id, query, k=4)
        if not docs:
            return json.dumps({
                "success": False, 
                "data": None, 
                "error": "No relevant information found in the document or document not indexed yet."
            })
            
        # Combine the text from the chunks
        context = "\n\n---\n\n".join([doc.page_content for doc in docs])
        
        return json.dumps({
            "success": True,
            "data": {"context": context},
            "error": None
        })
    except Exception as e:
        logger.error(f"Error searching document {document_id}: {e}")
        return json.dumps({
            "success": False,
            "data": None,
            "error": f"An error occurred during document search: {str(e)}"
        })

def get_document_tools():
    """Returns the document tools for the agent."""
    return [document_search]
