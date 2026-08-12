import logging
from fastapi import APIRouter, HTTPException, Header, Body
from typing import Optional, List
from pydantic import BaseModel
from datetime import date
from app.services.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/pantry", tags=["pantry"])

class PantryItemCreate(BaseModel):
    item_name: str
    quantity: float
    unit: str
    category: str
    expiry_date: Optional[date] = None

class PantryItemUpdate(BaseModel):
    item_name: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    category: Optional[str] = None
    expiry_date: Optional[date] = None

@router.get("")
def get_pantry_items(x_user_id: str = Header(...)):
    """Fetch all pantry items for the logged-in user."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    try:
        res = supabase.table("pantry_items").select("*").eq("user_id", x_user_id).order("created_at", desc=True).execute()
        return res.data
    except Exception as e:
        logger.error(f"Error fetching pantry items: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
def add_pantry_item(item: PantryItemCreate, x_user_id: str = Header(...)):
    """Add a new item to the user's pantry."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    data = {
        "user_id": x_user_id,
        "item_name": item.item_name,
        "quantity": item.quantity,
        "unit": item.unit,
        "category": item.category,
        "expiry_date": item.expiry_date.isoformat() if item.expiry_date else None
    }

    try:
        res = supabase.table("pantry_items").insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to insert pantry item")
        return res.data[0]
    except Exception as e:
        logger.error(f"Error adding pantry item: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{item_id}")
def update_pantry_item(item_id: str, item: PantryItemUpdate, x_user_id: str = Header(...)):
    """Update an existing pantry item."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    update_data = {k: v for k, v in item.dict().items() if v is not None}
    if "expiry_date" in update_data and update_data["expiry_date"]:
        update_data["expiry_date"] = update_data["expiry_date"].isoformat()

    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields provided for update")

    try:
        res = supabase.table("pantry_items").update(update_data).eq("id", item_id).eq("user_id", x_user_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Item not found or unauthorized")
        return res.data[0]
    except Exception as e:
        logger.error(f"Error updating pantry item: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{item_id}")
def delete_pantry_item(item_id: str, x_user_id: str = Header(...)):
    """Delete a pantry item."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    try:
        res = supabase.table("pantry_items").delete().eq("id", item_id).eq("user_id", x_user_id).execute()
        return {"status": "success", "message": "Item deleted"}
    except Exception as e:
        logger.error(f"Error deleting pantry item: {e}")
        raise HTTPException(status_code=500, detail=str(e))
