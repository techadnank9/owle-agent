from fastapi import APIRouter, Request

router = APIRouter()


@router.post("/gmail")
async def gmail_webhook(request: Request):
    return {"status": "not implemented"}
