import os
import sys
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.guide_service import create_guide_booking


class GuideServiceTests(unittest.TestCase):
    @patch("services.guide_service.get_supabase")
    def test_create_guide_booking_skips_duplicate_active_booking(self, mock_get_supabase):
        mock_client = MagicMock()
        mock_table = MagicMock()
        mock_select = MagicMock()
        mock_eq1 = MagicMock()
        mock_eq2 = MagicMock()
        mock_in = MagicMock()
        mock_limit = MagicMock()

        mock_get_supabase.return_value = mock_client
        mock_client.table.return_value = mock_table
        mock_table.select.return_value = mock_select
        mock_select.eq.return_value = mock_eq1
        mock_eq1.eq.return_value = mock_eq2
        mock_eq2.in_.return_value = mock_in
        mock_in.limit.return_value = mock_limit

        # Simulate that an active booking already exists
        mock_limit.execute.return_value = MagicMock(data=[{"id": 99}])

        booking_id = create_guide_booking({"username": "alice", "guide_id": 1})

        self.assertIsNone(booking_id)
        # Verify insert was not called on guide_bookings
        insert_calls = [
            call for call in mock_table.insert.call_args_list
        ]
        self.assertEqual(insert_calls, [])


if __name__ == "__main__":
    unittest.main()
