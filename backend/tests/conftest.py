import os
import pytest


@pytest.fixture(autouse=True)
def set_test_env(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
    monkeypatch.setenv("SUPABASE_URL", "https://test.supabase.co")
    monkeypatch.setenv("SUPABASE_KEY", "test-key")
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@localhost/test")
