import os
import sys
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.auth_service import login_user, _verify_password


class AuthServiceTests(unittest.TestCase):
    def test_verify_password_plaintext(self):
        self.assertTrue(_verify_password("1234", "1234"))
        self.assertFalse(_verify_password("1234", "wrong"))

    @patch("services.auth_service.get_supabase")
    def test_login_user_accepts_legacy_plaintext_passwords(self, mock_get_supabase):
        mock_client = MagicMock()
        mock_table = MagicMock()
        mock_select = MagicMock()
        mock_eq = MagicMock()
        mock_limit = MagicMock()

        mock_get_supabase.return_value = mock_client
        mock_client.table.return_value = mock_table
        mock_table.select.return_value = mock_select
        mock_select.eq.return_value = mock_eq
        mock_eq.limit.return_value = mock_limit

        mock_limit.execute.return_value = MagicMock(data=[{
            "user_id": 7,
            "username": "tourist1",
            "password": "1234",
        }])

        user, err = login_user({"username": "tourist1", "password": "1234"})
        self.assertIsNone(err)
        self.assertIsNotNone(user)
        self.assertEqual(user["username"], "tourist1")
        self.assertEqual(user["user_id"], 7)


if __name__ == "__main__":
    unittest.main()
