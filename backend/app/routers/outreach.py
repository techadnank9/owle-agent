from fastapi import APIRouter

router = APIRouter()


@router.get("/queue")
def get_queue():
    return []


@router.post("/{outreach_id}/approve")
def approve_outreach(outreach_id: str):
    return {"status": "not implemented"}
