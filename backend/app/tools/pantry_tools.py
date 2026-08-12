import json
import logging
from typing import Optional, List
from langchain_core.tools import tool
from app.services.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

def get_pantry_tools(user_id: str) -> list:
    """Factory function to inject user_id into pantry tools."""

    @tool
    def get_pantry_items() -> str:
        """Fetch all items currently in the user's smart pantry. Returns a JSON string of items."""
        supabase = get_supabase_client()
        if not supabase:
            return json.dumps({"error": "Database connection error"})
        
        try:
            res = supabase.table("pantry_items").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
            if not res.data:
                return json.dumps({"message": "Your pantry is empty."})
            return json.dumps({"items": res.data})
        except Exception as e:
            return json.dumps({"error": str(e)})

    @tool
    def search_pantry_items(query: str) -> str:
        """Search for a specific item in the pantry by name or category."""
        supabase = get_supabase_client()
        if not supabase:
            return json.dumps({"error": "Database connection error"})
        
        try:
            res = supabase.table("pantry_items").select("*").eq("user_id", user_id).execute()
            if not res.data:
                return json.dumps({"message": "Your pantry is empty."})
            
            # Simple python-side case-insensitive search
            query = query.lower()
            matched = [item for item in res.data if query in item["item_name"].lower() or query in item["category"].lower()]
            
            if not matched:
                return json.dumps({"message": f"No items found matching '{query}'."})
            return json.dumps({"items": matched})
        except Exception as e:
            return json.dumps({"error": str(e)})

    @tool
    def get_low_stock_items() -> str:
        """Fetch pantry items that are running low on stock (quantity <= 1)."""
        supabase = get_supabase_client()
        if not supabase:
            return json.dumps({"error": "Database connection error"})
        
        try:
            res = supabase.table("pantry_items").select("*").eq("user_id", user_id).lte("quantity", 1).execute()
            if not res.data:
                return json.dumps({"message": "You don't have any low stock items."})
            return json.dumps({"items": res.data})
        except Exception as e:
            return json.dumps({"error": str(e)})

    @tool
    def add_pantry_item(item_name: str, quantity: float, unit: str, category: str, expiry_date: Optional[str] = None) -> str:
        """
        Add a new grocery/item to the pantry.
        Args:
            item_name: Name of the item (e.g. "Rice")
            quantity: Amount (e.g. 5)
            unit: Unit of measurement (e.g. "kg", "pieces", "liter")
            category: Category (e.g. "Grocery", "Dairy", "Vegetables", "Other")
            expiry_date: Optional expiry date in YYYY-MM-DD format.
        """
        supabase = get_supabase_client()
        if not supabase:
            return json.dumps({"error": "Database connection error"})
            
        data = {
            "user_id": user_id,
            "item_name": item_name,
            "quantity": quantity,
            "unit": unit,
            "category": category,
            "expiry_date": expiry_date
        }
        
        try:
            res = supabase.table("pantry_items").insert(data).execute()
            return json.dumps({"success": True, "message": f"Added {quantity} {unit} of {item_name} to {category}."})
        except Exception as e:
            return json.dumps({"error": str(e)})

    @tool
    def update_pantry_item(item_name: str, new_quantity: float) -> str:
        """
        Update the quantity of an existing pantry item by its exact name.
        Note: You must know the exact item_name to update it. Use search_pantry_items first if unsure.
        """
        supabase = get_supabase_client()
        if not supabase:
            return json.dumps({"error": "Database connection error"})
            
        try:
            # First find the item
            res = supabase.table("pantry_items").select("id, item_name").eq("user_id", user_id).ilike("item_name", item_name).execute()
            if not res.data:
                return json.dumps({"error": f"Item '{item_name}' not found in pantry."})
                
            item_id = res.data[0]["id"]
            
            # Update it
            update_res = supabase.table("pantry_items").update({"quantity": new_quantity}).eq("id", item_id).execute()
            return json.dumps({"success": True, "message": f"Updated {res.data[0]['item_name']} quantity to {new_quantity}."})
        except Exception as e:
            return json.dumps({"error": str(e)})

    @tool
    def delete_pantry_item(item_name: str) -> str:
        """
        Remove/Delete an item completely from the pantry by its name.
        """
        supabase = get_supabase_client()
        if not supabase:
            return json.dumps({"error": "Database connection error"})
            
        try:
            # First find the item
            res = supabase.table("pantry_items").select("id, item_name").eq("user_id", user_id).ilike("item_name", item_name).execute()
            if not res.data:
                return json.dumps({"error": f"Item '{item_name}' not found in pantry."})
                
            item_id = res.data[0]["id"]
            
            # Delete it
            supabase.table("pantry_items").delete().eq("id", item_id).execute()
            return json.dumps({"success": True, "message": f"Removed {res.data[0]['item_name']} from your pantry."})
        except Exception as e:
            return json.dumps({"error": str(e)})
            
    return [
        get_pantry_items,
        search_pantry_items,
        get_low_stock_items,
        add_pantry_item,
        update_pantry_item,
        delete_pantry_item
    ]
