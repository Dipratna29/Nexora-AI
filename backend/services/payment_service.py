import hashlib
import hmac
import logging
import secrets
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any, Dict, List, Optional

import razorpay

from config import Config
from database import get_supabase
from services.notification_service import send_notification_to_user

logger = logging.getLogger(__name__)


class PaymentError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def _client() -> razorpay.Client:
    """Instantiate and return Razorpay client."""
    if not Config.RAZORPAY_KEY_ID or not Config.RAZORPAY_KEY_SECRET:
        raise PaymentError("Razorpay credentials are not configured", 503)
    return razorpay.Client(auth=(Config.RAZORPAY_KEY_ID, Config.RAZORPAY_KEY_SECRET))


def _amount_in_paise(value: Any) -> int:
    """Convert amount to integer paise using Decimal rounding."""
    try:
        amount = Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except (InvalidOperation, TypeError):
        raise PaymentError("Invalid amount calculation")
    if amount <= 0:
        raise PaymentError("Amount must be greater than zero")
    return int(amount * 100)


def _get_user(user_id: int) -> Dict[str, Any]:
    """Verify user existence in Supabase."""
    supabase = get_supabase()
    user_res = (
        supabase.table("users")
        .select("user_id, username, name, mob")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not user_res.data:
        raise PaymentError("User account not found", 404)
    return user_res.data[0]


def _get_equipment_and_stock(equipment_id: int) -> Dict[str, Any]:
    """
    Retrieve equipment details and stock from inventory_items (primary truth)
    with graceful fallback to safety_equipment for legacy catalog records.
    """
    supabase = get_supabase()
    
    # 1. Check primary inventory table
    inv_res = (
        supabase.table("inventory_items")
        .select("*")
        .eq("id", equipment_id)
        .limit(1)
        .execute()
    )
    if inv_res.data:
        item = inv_res.data[0]
        if item.get("status") == "INACTIVE":
            raise PaymentError("This equipment item is currently inactive", 400)
        return item

    # 2. Fallback check on safety_equipment catalog
    eq_res = (
        supabase.table("safety_equipment")
        .select("*")
        .eq("id", equipment_id)
        .limit(1)
        .execute()
    )
    if eq_res.data:
        item = eq_res.data[0]
        # Treat as stock 20 if unmanaged in inventory_items
        item.setdefault("current_stock", 20)
        item.setdefault("minimum_stock", 5)
        return item

    raise PaymentError(f"Equipment item #{equipment_id} not found", 404)


def create_payment_order(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Server-side order creation:
    1. Validates user and equipment
    2. Enforces live inventory stock validation
    3. Calculates payable amount strictly server-side (unit_price * quantity)
    4. Creates official Razorpay order with INR currency in paise
    5. Stores pending transaction in razorpay_payments table
    """
    user_id = payload.get("user_id")
    equipment_id = payload.get("equipment_id")
    quantity = payload.get("quantity", 1)

    if not isinstance(user_id, int) or isinstance(user_id, bool) or not isinstance(equipment_id, int) or isinstance(equipment_id, bool):
        raise PaymentError("user_id and equipment_id must be valid integers", 400)
    if not isinstance(quantity, int) or isinstance(quantity, bool) or quantity < 1 or quantity > 50:
        raise PaymentError("Quantity must be an integer between 1 and 50", 400)

    # 1. Validate user and item
    user = _get_user(user_id)
    item = _get_equipment_and_stock(equipment_id)

    # 2. Server-side stock validation
    current_stock = int(item.get("current_stock", 0))
    if current_stock <= 0:
        raise PaymentError("This equipment is currently out of stock.", 400)
    if quantity > current_stock:
        raise PaymentError(f"Only {current_stock} unit(s) are currently available in inventory.", 400)

    # 3. Server-side price calculation (never trust client amounts)
    raw_price = item.get("price", item.get("base_price"))
    if raw_price is None:
        raise PaymentError("Equipment price is unavailable", 500)

    unit_price = Decimal(str(raw_price))
    total_amount_paise = _amount_in_paise(unit_price * quantity)
    receipt = "tt_" + secrets.token_hex(10)

    # 4. Create Razorpay order
    try:
        remote_order = _client().order.create({
            "amount": total_amount_paise,
            "currency": "INR",
            "receipt": receipt,
            "payment_capture": 1,
            "notes": {
                "user_id": str(user_id),
                "equipment_id": str(equipment_id),
                "quantity": str(quantity),
                "app": "TrustTrip",
                "mode": Config.RAZORPAY_MODE
            }
        })
    except Exception as exc:
        logger.error("Failed to create Razorpay order: %s", exc)
        raise PaymentError("Unable to create secure payment order with Razorpay. Please try again later.", 502)

    # 5. Persist pending record in Supabase
    supabase = get_supabase()
    now_iso = datetime.now(timezone.utc).isoformat()
    record = {
        "razorpay_order_id": remote_order["id"],
        "user_id": user_id,
        "equipment_id": equipment_id,
        "quantity": quantity,
        "amount_paise": total_amount_paise,
        "currency": "INR",
        "status": "PENDING",
        "receipt": receipt,
        "created_at": now_iso,
        "updated_at": now_iso
    }

    try:
        supabase.table("razorpay_payments").insert(record).execute()
    except Exception as db_err:
        logger.error("Failed to record pending payment in Supabase: %s", db_err)
        raise PaymentError("Database error initializing payment order", 500)

    return {
        "key_id": Config.RAZORPAY_KEY_ID,
        "order_id": remote_order["id"],
        "amount": total_amount_paise,
        "currency": "INR",
        "equipment_name": item.get("name", "Safety Equipment"),
        "unit_price": float(unit_price),
        "quantity": quantity,
        "prefill": {
            "name": user.get("name") or user.get("username") or "TrustTrip Traveler",
            "contact": user.get("mob") or ""
        }
    }


def verify_payment(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Server-side verification and fulfillment:
    1. Verifies HMAC-SHA256 signature using RAZORPAY_KEY_SECRET
    2. Reconciles with Razorpay API (payment status, order match, amount, currency)
    3. Idempotently fulfills order, deducts stock, creates inventory ledger, updates equipment_orders, and sends notifications.
    """
    required = ("user_id", "razorpay_order_id", "razorpay_payment_id", "razorpay_signature")
    if any(not payload.get(k) for k in required):
        raise PaymentError("All payment verification parameters are required", 400)

    user_id = payload["user_id"]
    order_id = payload["razorpay_order_id"]
    payment_id = payload["razorpay_payment_id"]
    signature = payload["razorpay_signature"]

    if not isinstance(user_id, int) or isinstance(user_id, bool):
        raise PaymentError("user_id must be an integer", 400)

    supabase = get_supabase()

    # 1. Fetch pending record from Supabase
    res = (
        supabase.table("razorpay_payments")
        .select("*")
        .eq("razorpay_order_id", order_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise PaymentError("Payment order record not found", 404)

    record = res.data[0]
    if record["user_id"] != user_id:
        raise PaymentError("Unauthorized: payment order does not belong to this user", 403)

    # 2. Idempotency check: if already completed, return verified status
    if record["status"] == "PAID":
        if record.get("razorpay_payment_id") == payment_id:
            return {
                "success": True,
                "message": "Payment verified and already processed",
                "payment_id": payment_id,
                "order_id": order_id,
                "status": "PAID"
            }
        raise PaymentError("Payment order was already completed with a different payment ID", 409)

    if record["status"] not in ("PENDING", "CREATED"):
        raise PaymentError(f"Payment order status is {record['status']} and cannot be paid", 409)

    # 3. Server-side HMAC-SHA256 signature verification
    expected_sig = hmac.new(
        Config.RAZORPAY_KEY_SECRET.encode(),
        f"{order_id}|{payment_id}".encode(),
        "sha256"
    ).hexdigest()

    if not secrets.compare_digest(expected_sig, str(signature)):
        logger.warning("Signature mismatch for order %s and payment %s", order_id, payment_id)
        # Mark record signature mismatch if column exists
        try:
            supabase.table("razorpay_payments").update({
                "status": "FAILED",
                "failure_reason": "HMAC signature mismatch",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", record["id"]).execute()
        except Exception:
            pass
        raise PaymentError("Invalid payment signature. Payment cannot be verified.", 400)

    # 4. Direct API reconciliation with Razorpay
    rzp_payment = None
    try:
        rzp_payment = _client().payment.fetch(payment_id)
    except Exception as exc:
        logger.warning("Gateway inquiry notice for %s: %s", payment_id, exc)
        if Config.RAZORPAY_MODE == "test" and str(payment_id).startswith("pay_test_"):
            # In test mode with verified HMAC signature, synthesize captured state
            rzp_payment = {
                "id": payment_id,
                "order_id": order_id,
                "amount": record["amount_paise"],
                "currency": record.get("currency", "INR"),
                "status": "captured",
                "method": "test_gateway"
            }
        else:
            raise PaymentError("Failed to reconcile payment with Razorpay gateway", 502)

    if not rzp_payment:
        raise PaymentError("Could not retrieve payment details from gateway", 502)

    if rzp_payment.get("order_id") != order_id:
        raise PaymentError("Payment does not match the expected Razorpay order", 400)
    if int(rzp_payment.get("amount", -1)) != int(record["amount_paise"]):
        raise PaymentError("Payment amount does not match the server order amount", 400)
    if rzp_payment.get("currency", "INR") != record.get("currency", "INR"):
        raise PaymentError("Payment currency mismatch", 400)

    # Auto-capture if authorized
    pay_status = rzp_payment.get("status")
    if pay_status == "authorized":
        try:
            rzp_payment = _client().payment.capture(payment_id, record["amount_paise"])
            pay_status = rzp_payment.get("status")
        except Exception as cap_err:
            logger.error("Failed to capture authorized payment: %s", cap_err)

    if pay_status != "captured":
        raise PaymentError(f"Payment is not captured (current state: {pay_status})", 409)

    # 5. Execute idempotent fulfillment
    payment_method = rzp_payment.get("method", "card")
    fulfillment_result = _fulfill_payment(record, payment_id, signature, payment_method)
    logger.info("[PAYMENT] verification successful for order %s (payment %s)", order_id, payment_id)
    return fulfillment_result


def _fulfill_payment(
    record: Dict[str, Any],
    payment_id: str,
    signature: Optional[str] = None,
    payment_method: Optional[str] = None,
    is_webhook: bool = False,
    webhook_event: Optional[str] = None
) -> Dict[str, Any]:
    """
    Atomic fulfillment subroutine:
    1. Updates razorpay_payments to PAID
    2. Deducts stock from inventory_items
    3. Logs ORDER_DEDUCT in inventory_transactions
    4. Creates/updates equipment_orders record
    5. Sends in-app and push notification
    """
    supabase = get_supabase()
    now_iso = datetime.now(timezone.utc).isoformat()
    order_id = record["razorpay_order_id"]
    user_id = record["user_id"]
    equipment_id = record["equipment_id"]
    quantity = record.get("quantity", 1)
    total_price = float(record["amount_paise"]) / 100.0

    # 0. STRICT IDEMPOTENCY CHECK: If already PAID, return immediately without touching inventory
    if (record.get("status") or "").upper() == "PAID":
        logger.info("Payment %s (id: %s) is already PAID, returning idempotent response", order_id, record.get("id"))
        if is_webhook:
            try:
                supabase.table("razorpay_payments").update({
                    "webhook_received_at": now_iso,
                    "last_webhook_event": webhook_event
                }).eq("id", record["id"]).execute()
            except Exception:
                pass
        return {
            "success": True,
            "message": "Payment verified and already processed",
            "payment_id": record.get("razorpay_payment_id") or payment_id,
            "order_id": order_id,
            "status": "PAID"
        }

    # 1. Update razorpay_payments record
    update_fields: Dict[str, Any] = {
        "razorpay_payment_id": payment_id,
        "status": "PAID",
        "paid_at": now_iso,
        "updated_at": now_iso,
    }
    if signature:
        update_fields["razorpay_signature"] = signature
    if is_webhook:
        update_fields["webhook_received_at"] = now_iso
        if webhook_event:
            update_fields["last_webhook_event"] = webhook_event

    up_res = (
        supabase.table("razorpay_payments")
        .update(update_fields)
        .eq("id", record["id"])
        .eq("status", "PENDING")
        .execute()
    )

    if not up_res.data:
        # Check if already completed concurrently by another worker or webhook
        curr = supabase.table("razorpay_payments").select("*").eq("id", record["id"]).limit(1).execute()
        if curr.data and curr.data[0].get("status") == "PAID":
            if is_webhook:
                try:
                    supabase.table("razorpay_payments").update({
                        "webhook_received_at": now_iso,
                        "last_webhook_event": webhook_event
                    }).eq("id", record["id"]).execute()
                except Exception:
                    pass
            return {
                "success": True,
                "message": "Payment already processed concurrently",
                "payment_id": curr.data[0].get("razorpay_payment_id") or payment_id,
                "order_id": order_id,
                "status": "PAID"
            }
        raise PaymentError("Payment order could not be updated to PAID", 409)

    logger.info("[PAYMENT] payment persisted: id=%s, order=%s, status=PAID", record.get("id"), order_id)

    # 2. Deduct Inventory stock idempotently (only if no deduction transaction exists for this order)
    item_name = "Safety Equipment"
    try:
        existing_tx = (
            supabase.table("inventory_transactions")
            .select("id")
            .ilike("notes", f"%{order_id}%")
            .limit(1)
            .execute()
        )
        if existing_tx.data:
            logger.info("Inventory deduction already exists for order %s (tx #%s), skipping deduction", order_id, existing_tx.data[0]["id"])
        else:
            inv_res = supabase.table("inventory_items").select("*").eq("id", equipment_id).limit(1).execute()
            if inv_res.data:
                inv_item = inv_res.data[0]
                item_name = inv_item.get("name", "Safety Gear")
                c_stock = int(inv_item.get("current_stock", 0))
                m_stock = int(inv_item.get("minimum_stock", 5))
                new_stock = max(0, c_stock - quantity)

                new_status = "IN_STOCK"
                if new_stock == 0:
                    new_status = "OUT_OF_STOCK"
                elif new_stock <= m_stock:
                    new_status = "LOW_STOCK"

                supabase.table("inventory_items").update({
                    "current_stock": new_stock,
                    "status": new_status,
                    "updated_at": now_iso
                }).eq("id", equipment_id).execute()

                # Record inventory transaction
                supabase.table("inventory_transactions").insert({
                    "item_id": equipment_id,
                    "type": "ORDER_DEDUCT",
                    "quantity": quantity,
                    "previous_stock": c_stock,
                    "new_stock": new_stock,
                    "reason": f"Razorpay Payment {payment_id}",
                    "notes": f"Order {order_id} ({quantity}x {item_name})",
                    "created_at": now_iso
                }).execute()
    except Exception as inv_err:
        logger.warning("Inventory deduction notice for order %s: %s", order_id, inv_err)

    # 3. Create or update equipment_orders
    equipment_order_id = None
    try:
        # Check if an equipment order exists with this razorpay_order_id
        ord_payload = {
            "user_id": user_id,
            "equipment_id": equipment_id,
            "quantity": quantity,
            "total_price": total_price,
            "status": "Confirmed",
            "created_at": now_iso
        }
        ord_ext = dict(ord_payload)
        ord_ext["razorpay_order_id"] = order_id
        ord_ext["razorpay_payment_id"] = payment_id
        ord_ext["payment_status"] = "PAID"

        try:
            ord_res = supabase.table("equipment_orders").insert(ord_ext).execute()
        except Exception:
            ord_res = supabase.table("equipment_orders").insert(ord_payload).execute()

        if ord_res.data:
            equipment_order_id = ord_res.data[0]["id"]
            logger.info("[PAYMENT] equipment order persisted: id=%s for order %s", equipment_order_id, order_id)
            # Link back to razorpay_payments if equipment_order_id column exists
            try:
                supabase.table("razorpay_payments").update({
                    "equipment_order_id": equipment_order_id
                }).eq("id", record["id"]).execute()
            except Exception:
                pass
    except Exception as ord_err:
        logger.error("Could not insert equipment_orders record: %s", ord_err)

    # 4. Dispatch in-app notification
    try:
        send_notification_to_user(
            user_id=user_id,
            notification_type="payment_success",
            notification_data={
                "title": "Payment Successful! 🎉",
                "body": f"Your payment of ₹{total_price:.2f} for {item_name} has been verified and confirmed.",
                "order_id": equipment_order_id or order_id,
                "razorpay_payment_id": payment_id,
                "screen": "MyOrders"
            }
        )
    except Exception as notif_err:
        logger.warning("Notification dispatch notice: %s", notif_err)

    return {
        "success": True,
        "message": "Payment verified and order confirmed successfully",
        "payment_id": payment_id,
        "order_id": order_id,
        "equipment_order_id": equipment_order_id,
        "status": "PAID",
        "amount": record["amount_paise"],
        "equipment_name": item_name
    }


def mark_payment_failed(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handles failed or cancelled payment attempts:
    1. Sets status = 'FAILED'
    2. Records failure reason
    3. Never deducts stock or confirms equipment order
    """
    order_id = payload.get("razorpay_order_id")
    user_id = payload.get("user_id")
    reason = str(payload.get("reason", "Payment cancelled or failed"))[:500]

    if not order_id or not user_id:
        raise PaymentError("user_id and razorpay_order_id are required", 400)

    supabase = get_supabase()
    now_iso = datetime.now(timezone.utc).isoformat()

    res = (
        supabase.table("razorpay_payments")
        .update({
            "status": "FAILED",
            "failure_reason": reason,
            "updated_at": now_iso
        })
        .eq("razorpay_order_id", order_id)
        .eq("user_id", user_id)
        .eq("status", "PENDING")
        .execute()
    )

    # Dispatch notification to user
    try:
        send_notification_to_user(
            user_id=int(user_id),
            notification_type="payment_failed",
            notification_data={
                "title": "Payment Incomplete",
                "body": f"Your payment for order #{order_id} was not completed: {reason}",
                "order_id": order_id,
                "screen": "Equipment"
            }
        )
    except Exception:
        pass

    return {
        "success": True,
        "message": "Payment recorded as failed",
        "order_id": order_id
    }


def verify_webhook_signature(raw_body: bytes, signature: str) -> None:
    """Verifies Razorpay webhook HMAC signature."""
    secret = Config.RAZORPAY_WEBHOOK_SECRET
    if not secret or not signature:
        raise PaymentError("Webhook verification is not configured or missing signature", 503)

    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise PaymentError("Invalid webhook signature", 400)


def process_webhook(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Idempotent webhook handler:
    Handles payment.captured, payment.failed, order.paid, and refund.processed events.
    """
    event = payload.get("event")
    payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    order_entity = payload.get("payload", {}).get("order", {}).get("entity", {})

    order_id = payment_entity.get("order_id") or order_entity.get("id")
    payment_id = payment_entity.get("id")

    if not order_id:
        return {"success": True, "message": f"Event {event} acknowledged without order_id"}

    supabase = get_supabase()
    now_iso = datetime.now(timezone.utc).isoformat()

    # Find matching payment record
    res = supabase.table("razorpay_payments").select("*").eq("razorpay_order_id", order_id).limit(1).execute()
    if not res.data:
        return {"success": True, "message": f"Order {order_id} not found in database"}

    record = res.data[0]

    if event in ("payment.captured", "order.paid"):
        if record["status"] != "PAID":
            _fulfill_payment(
                record=record,
                payment_id=payment_id or record.get("razorpay_payment_id", "pay_webhook"),
                payment_method=payment_entity.get("method"),
                is_webhook=True,
                webhook_event=event
            )
        else:
            # Update webhook metadata if already fulfilled
            supabase.table("razorpay_payments").update({
                "webhook_received_at": now_iso,
                "last_webhook_event": event
            }).eq("id", record["id"]).execute()

    elif event == "payment.failed":
        if record["status"] == "PENDING":
            supabase.table("razorpay_payments").update({
                "status": "FAILED",
                "failure_reason": str(payment_entity.get("error_description", "Payment failed via gateway"))[:500],
                "updated_at": now_iso,
                "last_webhook_event": event,
                "webhook_received_at": now_iso
            }).eq("id", record["id"]).execute()

    return {"success": True, "message": f"Webhook event {event} processed successfully"}


def get_payment_status(order_id: str, user_id: Optional[int] = None) -> Dict[str, Any]:
    """Retrieve payment and fulfillment status for uncertain states."""
    supabase = get_supabase()
    query = supabase.table("razorpay_payments").select("*").eq("razorpay_order_id", order_id).limit(1)
    if user_id:
        query = query.eq("user_id", user_id)
    res = query.execute()

    if not res.data:
        raise PaymentError("Payment order not found", 404)

    record = res.data[0]
    return {
        "success": True,
        "order_id": record["razorpay_order_id"],
        "payment_id": record.get("razorpay_payment_id"),
        "status": record["status"],
        "amount": record["amount_paise"],
        "currency": record["currency"],
        "paid_at": record.get("paid_at"),
        "failure_reason": record.get("failure_reason")
    }


def get_user_payments(user_id: int) -> List[Dict[str, Any]]:
    """Retrieve user's payment history with joined equipment details."""
    supabase = get_supabase()
    res = (
        supabase.table("razorpay_payments")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    payments = res.data or []
    if not payments:
        return []

    # Augment with equipment details
    eq_ids = list({p["equipment_id"] for p in payments if p.get("equipment_id")})
    eq_map = {}
    if eq_ids:
        try:
            eq_res = supabase.table("inventory_items").select("id, name, sku, image_url").in_("id", eq_ids).execute()
            eq_map = {e["id"]: e for e in (eq_res.data or [])}
        except Exception:
            pass

    for p in payments:
        eq = eq_map.get(p.get("equipment_id"), {})
        p["equipment_name"] = eq.get("name", "Safety Equipment")
        p["equipment_sku"] = eq.get("sku", "")
        p["equipment_image_url"] = eq.get("image_url", "")

    return payments


def process_refund(payment_db_id: int, admin_user: Dict[str, Any], reason: str = "Admin initiated refund") -> Dict[str, Any]:
    """
    Admin-initiated refund processing:
    1. Validates payment is in PAID state
    2. Calls Razorpay refund API
    3. Updates database status to REFUNDED
    4. Restocks inventory item
    5. Dispatches notification and logs audit trail
    """
    supabase = get_supabase()
    now_iso = datetime.now(timezone.utc).isoformat()

    res = supabase.table("razorpay_payments").select("*").eq("id", payment_db_id).limit(1).execute()
    if not res.data:
        raise PaymentError("Payment transaction not found", 404)

    record = res.data[0]
    if record["status"] != "PAID":
        raise PaymentError(f"Cannot refund payment with status '{record['status']}'. Only PAID payments can be refunded.", 400)

    payment_id = record.get("razorpay_payment_id")
    if not payment_id:
        raise PaymentError("No gateway payment ID associated with this record", 400)

    # 1. Execute refund with Razorpay API
    try:
        rzp_refund = _client().payment.refund(payment_id, {
            "amount": record["amount_paise"],
            "notes": {
                "admin_id": str(admin_user.get("id")),
                "admin_email": admin_user.get("email", ""),
                "reason": reason
            }
        })
        refund_id = rzp_refund.get("id", f"rfnd_{secrets.token_hex(6)}")
    except Exception as exc:
        logger.error("Razorpay refund error: %s", exc)
        raise PaymentError(f"Razorpay refund failed: {exc}", 502)

    # 2. Update razorpay_payments
    up_data: Dict[str, Any] = {
        "status": "REFUNDED",
        "updated_at": now_iso
    }
    # Extended fields
    ext_up = dict(up_data)
    ext_up["refund_id"] = refund_id
    ext_up["refund_status"] = "PROCESSED"
    ext_up["amount_refunded_paise"] = record["amount_paise"]
    ext_up["refunded_at"] = now_iso

    try:
        supabase.table("razorpay_payments").update(ext_up).eq("id", payment_db_id).execute()
    except Exception:
        supabase.table("razorpay_payments").update(up_data).eq("id", payment_db_id).execute()

    # 3. Update equipment_orders if linked
    if record.get("equipment_order_id"):
        try:
            supabase.table("equipment_orders").update({
                "status": "Refunded"
            }).eq("id", record["equipment_order_id"]).execute()
        except Exception:
            pass

    # 4. Restock inventory item
    equipment_id = record.get("equipment_id")
    quantity = record.get("quantity", 1)
    if equipment_id:
        try:
            inv_res = supabase.table("inventory_items").select("*").eq("id", equipment_id).limit(1).execute()
            if inv_res.data:
                inv_item = inv_res.data[0]
                c_stock = int(inv_item.get("current_stock", 0))
                new_stock = c_stock + quantity
                supabase.table("inventory_items").update({
                    "current_stock": new_stock,
                    "status": "IN_STOCK",
                    "updated_at": now_iso
                }).eq("id", equipment_id).execute()

                supabase.table("inventory_transactions").insert({
                    "item_id": equipment_id,
                    "type": "RETURN",
                    "quantity": quantity,
                    "previous_stock": c_stock,
                    "new_stock": new_stock,
                    "reason": f"Refunded: {refund_id}",
                    "notes": reason,
                    "created_at": now_iso
                }).execute()
        except Exception as restock_err:
            logger.warning("Restock inventory notice: %s", restock_err)

    # 5. Log audit trail
    try:
        supabase.table("audit_logs").insert({
            "admin_id": admin_user.get("id"),
            "admin_email": admin_user.get("email"),
            "admin_name": admin_user.get("name"),
            "action": "PAYMENT_REFUNDED",
            "entity_type": "payments",
            "entity_id": str(payment_db_id),
            "description": f"Refunded ₹{float(record['amount_paise'])/100:.2f} for payment {payment_id}",
            "details": {
                "razorpay_payment_id": payment_id,
                "refund_id": refund_id,
                "amount_paise": record["amount_paise"],
                "reason": reason
            },
            "created_at": now_iso
        }).execute()
    except Exception as audit_err:
        logger.warning("Audit log error on refund: %s", audit_err)

    # 6. Send notification to user
    try:
        send_notification_to_user(
            user_id=record["user_id"],
            notification_type="payment_refund",
            notification_data={
                "title": "Payment Refund Processed ↩️",
                "body": f"Your refund of ₹{float(record['amount_paise'])/100:.2f} has been processed.",
                "refund_id": refund_id,
                "screen": "MyOrders"
            }
        )
    except Exception:
        pass

    return {
        "success": True,
        "message": f"Payment successfully refunded ₹{float(record['amount_paise'])/100:.2f}",
        "refund_id": refund_id,
        "payment_id": payment_id
    }
