import os
import uuid
import logging
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.services.memory_store import store

logger = logging.getLogger(__name__)

# Global cache for the vector stores
_vector_stores = {}
_embeddings = None

def get_embeddings():
    global _embeddings
    if _embeddings is None:
        logger.info("Initializing HuggingFaceEmbeddings (all-MiniLM-L6-v2)...")
        _embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    return _embeddings

def get_vector_store(document_id: str):
    return _vector_stores.get(document_id)

def index_document(document_id: str, filename: str, content: str):
    """
    Chunks the document content, embeds it, and stores it in a FAISS index.
    Also saves the raw document in the memory store.
    """
    logger.info(f"Indexing document {document_id} ({filename})")
    
    # Save the raw document just in case it's needed elsewhere
    store.save_document(document_id, filename, content)
    
    # Text splitting
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
        is_separator_regex=False,
    )
    texts = text_splitter.split_text(content)
    
    docs = [Document(page_content=t, metadata={"source": filename, "doc_id": document_id}) for t in texts]
    
    # Embed and index
    embeddings = get_embeddings()
    vector_store = FAISS.from_documents(docs, embeddings)
    
    _vector_stores[document_id] = vector_store
    logger.info(f"Document {document_id} indexed with {len(docs)} chunks.")
    return document_id

def retrieve(document_id: str, query: str, k: int = 3):
    """
    Retrieves the top k chunks for a given query from a specific document.
    """
    vector_store = get_vector_store(document_id)
    if not vector_store:
        logger.warning(f"No vector store found for document {document_id}")
        return []
    
    docs = vector_store.similarity_search(query, k=k)
    return docs
