from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def list_accounts():
    return []


@router.post("/upload")
def upload_accounts():
    return {"status": "not implemented"}
