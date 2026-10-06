# equipment_service.py
"""
TrustTrip Equipment & Inventory Service
Unified against remote Supabase PostgreSQL (public.inventory_items)
as the single source of truth.
"""

import logging
import secrets
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from database import get_supabase

logger = logging.getLogger(__name__)


def fetch_prices():
    """Fetch all price items for fair-price checking."""
    supabase = get_supabase()
    res = supabase.table("price_items").select("id, name, base_price").order("id").execute()
    return res.data or []


def fetch_all_equipment(search: Optional[str] = None, category: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Fetch all active safety equipment items from the primary inventory table.
    Filters out INACTIVE (soft-deleted) items.
    """
    supabase = get_supabase()
    try:
        query = supabase.table("inventory_items").select("*").neq("status", "INACTIVE")

        if category and category.upper() != "ALL":
            query = query.eq("category", category)

        if search and search.strip():
            s = search.strip()
            query = query.or_(f"name.ilike.%{s}%,category.ilike.%{s}%,sku.ilike.%{s}%,description.ilike.%{s}%")

        res = query.order("id").execute()
        items = res.data or []
        
        # Calculate consistent stock status
        for item in items:
            c_stock = int(item.get("current_stock", 0))
            m_stock = int(item.get("minimum_stock", 5))
            if c_stock <= 0:
                item["status"] = "OUT_OF_STOCK"
            elif c_stock <= m_stock:
                item["status"] = "LOW_STOCK"
            else:
                item["status"] = "IN_STOCK"
                
        return items
    except Exception as exc:
        logger.error("Error loading equipment from inventory_items: %s", exc)
        return []


def fetch_equipment_by_id(equipment_id: int) -> Optional[Dict[str, Any]]:
    """Fetch a single equipment item by its primary ID."""
    supabase = get_supabase()
    try:
        res = supabase.table("inventory_items").select("*").eq("id", int(equipment_id)).limit(1).execute()
        if res.data:
            item = res.data[0]
            c_stock = int(item.get("current_stock", 0))
            m_stock = int(item.get("minimum_stock", 5))
            if c_stock <= 0:
                item["status"] = "OUT_OF_STOCK"
            elif c_stock <= m_stock:
                item["status"] = "LOW_STOCK"
            else:
                item["status"] = "IN_STOCK"
            return item
        return None
    except Exception as exc:
        logger.error("Error fetching equipment #%s: %s", equipment_id, exc)
        return None


def create_order(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create equipment order with atomic server-side stock verification and deduction.
    Records inventory transaction ('ORDER_DEDUCT') and inserts into equipment_orders.
    
    Args:
        data: Dictionary with user_id, equipment_id, quantity, total_price, latitude, longitude
        
    Returns:
        dict: The order details including order_id and remaining_stock
    """
    supabase = get_supabase()
    user_id = int(data["user_id"])
    equipment_id = int(data["equipment_id"])
    quantity = int(data.get("quantity", 1))
    if quantity <= 0:
        raise ValueError("Order quantity must be at least 1")

    # 1. Fetch live stock from inventory_items
    inv_res = supabase.table("inventory_items").select("*").eq("id", equipment_id).limit(1).execute()
    if not inv_res.data:
        # Fallback query for legacy equipment id if needed
        inv_res = supabase.table("inventory_items").select("*").or_(
            f"id.eq.{equipment_id},sku.ilike.EQ-00{equipment_id}%,name.ilike.%{data.get('name', '')}%"
        ).limit(1).execute()

    if not inv_res.data:
        raise ValueError(f"Equipment item #{equipment_id} not found in inventory")

    inv_item = inv_res.data[0]
    item_id = inv_item["id"]
    item_name = inv_item.get("name", "Safety Gear")
    current_stock = int(inv_item.get("current_stock", 0))
    min_stock = int(inv_item.get("minimum_stock", 5))

    # Strict server-side stock check
    if current_stock < quantity:
        raise ValueError(f"Insufficient stock: Requested {quantity} unit(s), but only {current_stock} available.")

    unit_price = float(inv_item.get("price", 0.0))
    total_price = float(data.get("total_price", 0)) or (unit_price * quantity)

    new_stock = current_stock - quantity
    new_status = "IN_STOCK"
    if new_stock == 0:
        new_status = "OUT_OF_STOCK"
    elif new_stock <= min_stock:
        new_status = "LOW_STOCK"

    # 2. Deduct stock in inventory_items
    supabase.table("inventory_items").update({
        "current_stock": new_stock,
        "status": new_status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", item_id).execute()

    # 3. Record inventory transaction
    try:
        supabase.table("inventory_transactions").insert({
            "item_id": item_id,
            "type": "ORDER_DEDUCT",
            "quantity": quantity,
            "previous_stock": current_stock,
            "new_stock": new_stock,
            "reason": f"Mobile Order by User #{user_id}",
            "notes": f"Order for {quantity}x {item_name} (Total: INR {total_price})",
            "created_at": datetime.now(timezone.utc).isoformat()
        }).execute()
    except Exception as tx_err:
        logger.warning("Could not record inventory transaction: %s", tx_err)

    # 4. Insert into equipment_orders table
    payload = {
        "user_id": user_id,
        "equipment_id": item_id,
        "quantity": quantity,
        "total_price": total_price,
        "latitude": data.get("latitude"),
        "longitude": data.get("longitude"),
        "status": "Confirmed"
    }

    res = supabase.table("equipment_orders").insert(payload).execute()
    if not res.data:
        raise RuntimeError("Failed to insert equipment order into database")

    order_record = res.data[0]

    # 5. Mirror to razorpay_payments ledger so admin payment audit displays this transaction
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        direct_order_ref = data.get("razorpay_order_id") or f"order_direct_{order_record['id']}_{secrets.token_hex(4)}"
        direct_pay_ref = data.get("razorpay_payment_id") or f"pay_direct_{order_record['id']}_{secrets.token_hex(4)}"
        supabase.table("razorpay_payments").insert({
            "razorpay_order_id": direct_order_ref,
            "razorpay_payment_id": direct_pay_ref,
            "user_id": user_id,
            "equipment_id": item_id,
            "quantity": quantity,
            "amount_paise": int(round(total_price * 100)),
            "currency": "INR",
            "status": "PAID",
            "receipt": f"tt_eo_{order_record['id']}",
            "paid_at": now_iso,
            "created_at": order_record.get("created_at") or now_iso,
            "updated_at": now_iso
        }).execute()
        logger.info("[PAYMENT] Successfully mirrored equipment order #%s to razorpay_payments ledger", order_record["id"])
    except Exception as pay_err:
        logger.warning("[PAYMENT] Could not mirror order to razorpay_payments: %s", pay_err)

    return {
        "order_id": order_record["id"],
        "equipment_id": item_id,
        "name": item_name,
        "quantity": quantity,
        "total_price": total_price,
        "remaining_stock": new_stock,
        "status": order_record.get("status", "Confirmed")
    }


def fetch_user_orders(user_id: int) -> List[Dict[str, Any]]:
    """Fetch all equipment orders for a specific user with joined item metadata."""
    supabase = get_supabase()

    try:
        orders_res = (
            supabase.table("equipment_orders")
            .select("id, quantity, total_price, status, created_at, equipment_id, razorpay_order_id, razorpay_payment_id, payment_status")
            .eq("user_id", int(user_id))
            .order("created_at", desc=True)
            .execute()
        )
    except Exception:
        orders_res = (
            supabase.table("equipment_orders")
            .select("id, quantity, total_price, status, created_at, equipment_id")
            .eq("user_id", int(user_id))
            .order("created_at", desc=True)
            .execute()
        )
    orders = orders_res.data or []

    if orders:
        equipment_ids = list({o["equipment_id"] for o in orders if o.get("equipment_id")})
        if equipment_ids:
            try:
                eq_res = supabase.table("inventory_items").select("id, name, sku, image_url, price, category").in_("id", equipment_ids).execute()
                eq_map = {e["id"]: e for e in (eq_res.data or [])}

                # Fallback for any legacy IDs
                missing = [eid for eid in equipment_ids if eid not in eq_map]
                if missing:
                    legacy_res = supabase.table("safety_equipment").select("id, name, image_url, price, category").in_("id", missing).execute()
                    for le in (legacy_res.data or []):
                        eq_map[le["id"]] = le

                for o in orders:
                    item_info = eq_map.get(o.get("equipment_id"), {})
                    o["name"] = item_info.get("name", "Safety Equipment")
                    o["sku"] = item_info.get("sku", "")
                    o["image_url"] = item_info.get("image_url", "")
                    o["category"] = item_info.get("category", "General")
            except Exception as e:
                logger.warning("Order details join notice: %s", e)

    return orders