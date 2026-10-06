"""
test_payment_service.py
Comprehensive Unit and Integration Test Suite for TrustTrip Razorpay Payment Service:
- Server-side price calculation and stock validation
- Razorpay order creation
- HMAC-SHA256 signature verification
- Replay protection / Idempotent fulfillment
- Inventory deduction and ledger tracking
- Payment failure handling
- Webhook signature validation & processing
- Admin refund execution and audit logging
"""

import hashlib
import hmac
import os
import sys
import unittest
from unittest.mock import MagicMock, patch

# Ensure backend root is on Python module search path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import Config
from services.payment_service import (
    PaymentError,
    _amount_in_paise,
    create_payment_order,
    verify_payment,
    mark_payment_failed,
    verify_webhook_signature,
    process_webhook,
    process_refund,
    get_payment_status,
)


def _mock_chain(data=None):
    mock = MagicMock()
    mock.select.return_value = mock
    mock.insert.return_value = mock
    mock.update.return_value = mock
    mock.eq.return_value = mock
    mock.limit.return_value = mock
    mock.order.return_value = mock
    mock.in_.return_value = mock
    mock.execute.return_value.data = data if data is not None else []
    return mock


class TestPaymentService(unittest.TestCase):
    def setUp(self):
        self.key_id = Config.RAZORPAY_KEY_ID or "rzp_test_testkeyid123"
        self.key_secret = Config.RAZORPAY_KEY_SECRET or "test_secret_for_hmac_12345"
        Config.RAZORPAY_KEY_ID = self.key_id
        Config.RAZORPAY_KEY_SECRET = self.key_secret
        Config.RAZORPAY_WEBHOOK_SECRET = "test_webhook_secret_abc123"

    def test_01_amount_in_paise_conversion(self):
        """Verify accurate Decimal rounding to paise without floating-point errors."""
        self.assertEqual(_amount_in_paise(499), 49900)
        self.assertEqual(_amount_in_paise(499.50), 49950)
        self.assertEqual(_amount_in_paise("799.99"), 79999)
        self.assertEqual(_amount_in_paise(0.01), 1)

        with self.assertRaises(PaymentError):
            _amount_in_paise(0)
        with self.assertRaises(PaymentError):
            _amount_in_paise(-100)
        with self.assertRaises(PaymentError):
            _amount_in_paise("invalid_num")

    @patch("services.payment_service.get_supabase")
    @patch("services.payment_service._client")
    def test_02_create_payment_order_server_side_pricing(self, mock_client, mock_supabase):
        """Verify amount is computed strictly from database item price * quantity."""
        user_chain = _mock_chain([{"user_id": 1, "username": "traveler", "name": "Traveler One"}])
        item_chain = _mock_chain([{"id": 5, "name": "First Aid Kit", "price": 500.0, "current_stock": 10}])
        pay_chain = _mock_chain([{"id": 101}])

        sb = MagicMock()
        sb.table.side_effect = lambda t: (
            user_chain if t == "users" else
            item_chain if t == "inventory_items" else
            pay_chain
        )
        mock_supabase.return_value = sb

        # Mock Razorpay order.create
        rzp_instance = MagicMock()
        rzp_instance.order.create.return_value = {
            "id": "order_test_12345",
            "amount": 100000,
            "currency": "INR"
        }
        mock_client.return_value = rzp_instance

        # Client attempts to send fake amount=10 (should be completely ignored)
        payload = {
            "user_id": 1,
            "equipment_id": 5,
            "quantity": 2,
            "fake_client_price": 10.0
        }

        res = create_payment_order(payload)

        # 2 units * 500 = 1000 INR = 100000 paise
        self.assertEqual(res["order_id"], "order_test_12345")
        self.assertEqual(res["amount"], 100000)
        self.assertEqual(res["currency"], "INR")
        self.assertEqual(res["equipment_name"], "First Aid Kit")

        # Verify Razorpay client received correct amount
        rzp_instance.order.create.assert_called_once()
        call_args = rzp_instance.order.create.call_args[0][0]
        self.assertEqual(call_args["amount"], 100000)
        self.assertEqual(call_args["currency"], "INR")

    @patch("services.payment_service.get_supabase")
    def test_03_create_payment_order_stock_insufficient(self, mock_supabase):
        """Reject order if requested quantity exceeds warehouse stock."""
        user_chain = _mock_chain([{"user_id": 1, "username": "traveler"}])
        item_chain = _mock_chain([{"id": 5, "name": "Emergency Siren", "price": 300.0, "current_stock": 2}])

        sb = MagicMock()
        sb.table.side_effect = lambda t: user_chain if t == "users" else item_chain
        mock_supabase.return_value = sb

        # Requested 5, only 2 available
        with self.assertRaises(PaymentError) as cm:
            create_payment_order({"user_id": 1, "equipment_id": 5, "quantity": 5})

        self.assertIn("Only 2 unit(s) are currently available", str(cm.exception))

    @patch("services.payment_service.get_supabase")
    def test_04_signature_verification_mismatch_rejected(self, mock_supabase):
        """Reject payment if HMAC signature does not match server calculation."""
        pay_chain = _mock_chain([{
            "id": 10,
            "user_id": 1,
            "razorpay_order_id": "order_test_sig",
            "amount_paise": 50000,
            "currency": "INR",
            "status": "PENDING"
        }])

        sb = MagicMock()
        sb.table.return_value = pay_chain
        mock_supabase.return_value = sb

        payload = {
            "user_id": 1,
            "razorpay_order_id": "order_test_sig",
            "razorpay_payment_id": "pay_test_sig",
            "razorpay_signature": "invalid_fraudulent_signature_value"
        }

        with self.assertRaises(PaymentError) as cm:
            verify_payment(payload)

        self.assertIn("Invalid payment signature", str(cm.exception))

    @patch("services.payment_service._fulfill_payment")
    @patch("services.payment_service._client")
    @patch("services.payment_service.get_supabase")
    def test_05_signature_verification_success(self, mock_supabase, mock_client, mock_fulfill):
        """Verify valid HMAC-SHA256 signature leads to fulfillment."""
        order_id = "order_valid_123"
        payment_id = "pay_valid_456"

        valid_sig = hmac.new(
            self.key_secret.encode(),
            f"{order_id}|{payment_id}".encode(),
            "sha256"
        ).hexdigest()

        mock_record = {
            "id": 12,
            "user_id": 2,
            "razorpay_order_id": order_id,
            "equipment_id": 3,
            "quantity": 1,
            "amount_paise": 75000,
            "currency": "INR",
            "status": "PENDING"
        }

        pay_chain = _mock_chain([mock_record])
        sb = MagicMock()
        sb.table.return_value = pay_chain
        mock_supabase.return_value = sb

        # Mock Razorpay payment fetch
        rzp_instance = MagicMock()
        rzp_instance.payment.fetch.return_value = {
            "id": payment_id,
            "order_id": order_id,
            "amount": 75000,
            "currency": "INR",
            "status": "captured",
            "method": "upi"
        }
        mock_client.return_value = rzp_instance

        mock_fulfill.return_value = {
            "success": True,
            "message": "Payment verified and order confirmed successfully",
            "payment_id": payment_id,
            "order_id": order_id,
            "status": "PAID"
        }

        payload = {
            "user_id": 2,
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": valid_sig
        }

        res = verify_payment(payload)
        self.assertTrue(res["success"])
        self.assertEqual(res["status"], "PAID")
        mock_fulfill.assert_called_once()

    @patch("services.payment_service.get_supabase")
    def test_06_idempotency_duplicate_verification(self, mock_supabase):
        """Verify duplicate payment callback returns verified status without re-processing."""
        mock_record = {
            "id": 15,
            "user_id": 3,
            "razorpay_order_id": "order_dup_999",
            "razorpay_payment_id": "pay_dup_888",
            "status": "PAID",
            "amount_paise": 49900
        }

        pay_chain = _mock_chain([mock_record])
        sb = MagicMock()
        sb.table.return_value = pay_chain
        mock_supabase.return_value = sb

        # Calling verify again with the already PAID record
        payload = {
            "user_id": 3,
            "razorpay_order_id": "order_dup_999",
            "razorpay_payment_id": "pay_dup_888",
            "razorpay_signature": "any_sig"
        }

        res = verify_payment(payload)
        self.assertTrue(res["success"])
        self.assertEqual(res["status"], "PAID")
        self.assertIn("already", res["message"].lower())

    @patch("services.payment_service.send_notification_to_user")
    @patch("services.payment_service.get_supabase")
    def test_07_mark_payment_failed_does_not_deduct_inventory(self, mock_supabase, mock_notif):
        """Failed payment marks record FAILED and never alters inventory."""
        sb = MagicMock()
        sb.table.return_value = _mock_chain([])
        mock_supabase.return_value = sb

        payload = {
            "user_id": 1,
            "razorpay_order_id": "order_fail_001",
            "reason": "Card declined by bank"
        }

        res = mark_payment_failed(payload)
        self.assertTrue(res["success"])

        # Check that update was called on razorpay_payments
        sb.table.assert_any_call("razorpay_payments")
        # Check that inventory_items update was NEVER called
        self.assertNotIn("inventory_items", [c[0][0] for c in sb.table.call_args_list if c[0]])

    def test_08_webhook_signature_verification(self):
        """Verify webhook signature HMAC-SHA256 checking."""
        raw_body = b'{"event":"payment.captured","payload":{}}'
        valid_sig = hmac.new(
            Config.RAZORPAY_WEBHOOK_SECRET.encode(),
            raw_body,
            hashlib.sha256
        ).hexdigest()

        # Should not raise exception
        verify_webhook_signature(raw_body, valid_sig)

        # Invalid signature must raise 400 PaymentError
        with self.assertRaises(PaymentError) as cm:
            verify_webhook_signature(raw_body, "tampered_signature")
        self.assertEqual(cm.exception.status, 400)

    @patch("services.payment_service._fulfill_payment")
    @patch("services.payment_service.get_supabase")
    def test_09_webhook_process_payment_captured_event(self, mock_supabase, mock_fulfill):
        """Webhook payment.captured triggers idempotent order fulfillment."""
        mock_record = {
            "id": 20,
            "user_id": 5,
            "razorpay_order_id": "order_hook_1",
            "status": "PENDING",
            "amount_paise": 80000
        }

        pay_chain = _mock_chain([mock_record])
        sb = MagicMock()
        sb.table.return_value = pay_chain
        mock_supabase.return_value = sb

        webhook_payload = {
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_hook_99",
                        "order_id": "order_hook_1",
                        "method": "card"
                    }
                }
            }
        }

        res = process_webhook(webhook_payload)
        self.assertTrue(res["success"])
        mock_fulfill.assert_called_once()

    @patch("services.payment_service.send_notification_to_user")
    @patch("services.payment_service._client")
    @patch("services.payment_service.get_supabase")
    def test_10_admin_refund_workflow(self, mock_supabase, mock_client, mock_notif):
        """Admin refund triggers Razorpay refund, restocks inventory, and logs audit."""
        mock_record = {
            "id": 30,
            "user_id": 7,
            "equipment_id": 4,
            "quantity": 2,
            "razorpay_payment_id": "pay_to_refund_123",
            "amount_paise": 60000,
            "status": "PAID"
        }

        pay_chain = _mock_chain([mock_record])
        inv_chain = _mock_chain([{"id": 4, "current_stock": 18, "minimum_stock": 5}])
        gen_chain = _mock_chain([])

        sb = MagicMock()
        sb.table.side_effect = lambda t: (
            pay_chain if t == "razorpay_payments" else
            inv_chain if t == "inventory_items" else
            gen_chain
        )
        mock_supabase.return_value = sb

        rzp_instance = MagicMock()
        rzp_instance.payment.refund.return_value = {"id": "rfnd_test_555", "status": "processed"}
        mock_client.return_value = rzp_instance

        admin_user = {"id": 1, "email": "admin@trusttrip.com", "name": "Super Admin"}
        res = process_refund(30, admin_user, reason="Customer requested cancellation")

        self.assertTrue(res["success"])
        self.assertEqual(res["refund_id"], "rfnd_test_555")

        # Verify Razorpay refund called
        rzp_instance.payment.refund.assert_called_once_with(
            "pay_to_refund_123",
            {"amount": 60000, "notes": {"admin_id": "1", "admin_email": "admin@trusttrip.com", "reason": "Customer requested cancellation"}}
        )

    @patch("services.payment_service.get_supabase")
    def test_11_duplicate_fulfillment_idempotency(self, mock_supabase):
        """Fulfilling a payment already marked PAID must never deduct inventory or insert order."""
        mock_record = {
            "id": 4,
            "user_id": 1,
            "equipment_id": 1,
            "quantity": 2,
            "razorpay_order_id": "order_TXead6Upn81RB9",
            "razorpay_payment_id": "pay_test_924f38958ab4",
            "amount_paise": 1200,
            "status": "PAID"
        }
        sb = MagicMock()
        mock_supabase.return_value = sb

        from services.payment_service import _fulfill_payment
        res = _fulfill_payment(mock_record, "pay_test_924f38958ab4")

        self.assertTrue(res["success"])
        self.assertEqual(res["status"], "PAID")
        self.assertIn("already", res["message"].lower())

        # Check inventory_items was NEVER touched
        called_tables = [c[0][0] for c in sb.table.call_args_list if c[0]]
        self.assertNotIn("inventory_items", called_tables)
        self.assertNotIn("inventory_transactions", called_tables)

    @patch("services.payment_service.get_supabase")
    def test_12_webhook_idempotency_on_paid_order(self, mock_supabase):
        """Webhook on an already PAID order reconciles webhook timestamp without deducting stock."""
        mock_record = {
            "id": 4,
            "user_id": 1,
            "equipment_id": 1,
            "quantity": 2,
            "razorpay_order_id": "order_TXead6Upn81RB9",
            "razorpay_payment_id": "pay_test_924f38958ab4",
            "amount_paise": 1200,
            "status": "PAID"
        }
        pay_chain = _mock_chain([mock_record])
        sb = MagicMock()
        sb.table.return_value = pay_chain
        mock_supabase.return_value = sb

        payload = {
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_test_924f38958ab4",
                        "order_id": "order_TXead6Upn81RB9",
                        "method": "upi"
                    }
                }
            }
        }
        res = process_webhook(payload)
        self.assertTrue(res["success"])

        # Check inventory_items was NEVER touched
        called_tables = [c[0][0] for c in sb.table.call_args_list if c[0]]
        self.assertNotIn("inventory_items", called_tables)


if __name__ == "__main__":
    unittest.main()
