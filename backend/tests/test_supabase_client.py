import pytest
from unittest.mock import patch, MagicMock


def test_get_supabase_returns_singleton():
    import importlib
    import app.supabase_client as sc
    sc._client = None  # reset singleton
    mock_client = MagicMock()
    with patch("app.supabase_client.create_client", return_value=mock_client) as mock_create:
        c1 = sc.get_supabase()
        c2 = sc.get_supabase()
        assert c1 is c2
        mock_create.assert_called_once()
    sc._client = None  # cleanup


def test_write_audit_log_inserts_row():
    mock_client = MagicMock()
    mock_client.table.return_value.insert.return_value.execute.return_value = MagicMock()
    import app.supabase_client as sc
    sc._client = mock_client
    from app.supabase_client import write_audit_log
    write_audit_log(
        account_id="acc-1",
        agent_run_id="run-1",
        node="account_selector",
        action="scored account",
        rationale="Large SNF",
        verified_facts={"bed_count": 120},
        inferred_assumptions={},
    )
    mock_client.table.assert_called_with("audit_log")
    sc._client = None


def test_update_account_calls_update():
    mock_client = MagicMock()
    mock_client.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()
    import app.supabase_client as sc
    sc._client = mock_client
    from app.supabase_client import update_account
    update_account("acc-1", {"icp_score": 90.0})
    mock_client.table.assert_called_with("accounts")
    sc._client = None
