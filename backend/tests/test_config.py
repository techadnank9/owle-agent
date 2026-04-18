import os
import pytest
from unittest.mock import patch


def test_settings_load_from_env():
    env = {
        "ANTHROPIC_API_KEY": "sk-ant-test",
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_KEY": "test-key",
        "DATABASE_URL": "postgresql://user:pass@localhost:5432/testdb",
    }
    with patch.dict(os.environ, env):
        from app.config import Settings
        s = Settings()
        assert s.anthropic_api_key == "sk-ant-test"
        assert s.supabase_url == "https://test.supabase.co"
        assert s.database_url == "postgresql://user:pass@localhost:5432/testdb"


def test_settings_missing_required_raises():
    with patch.dict(os.environ, {}, clear=True):
        from app.config import Settings
        with pytest.raises(Exception):
            Settings()
