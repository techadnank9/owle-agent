from contextlib import asynccontextmanager
from fastapi import FastAPI

from .config import settings
from .db import init_checkpointer
from .routers import accounts, outreach, webhooks


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.checkpointer = init_checkpointer(settings.database_url)
    yield


app = FastAPI(title="Owle Agent API", lifespan=lifespan)

app.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
app.include_router(outreach.router, prefix="/outreach", tags=["outreach"])
app.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])


@app.get("/health")
def health():
    return {"status": "ok"}
