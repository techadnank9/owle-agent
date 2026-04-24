from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str
    supabase_url: str
    supabase_key: str
    database_url: str
    langsmith_api_key: str = ""
    langchain_tracing_v2: bool = False
    gmail_token: str = ""
    gmail_sender_email: str = ""
    tavily_api_key: str = ""
    apify_api_key: str = ""
    apollo_api_key: str = ""
    agentmail_api_key: str = ""
    backend_url: str = ""  # public URL for webhook registration, e.g. https://owle-backend.onrender.com

    model_config = {"env_file": ".env"}


settings = Settings()
