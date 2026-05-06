from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import uuid
from routes.auth import current_user, require_consumer
from services import cosmos_service as db

router = APIRouter()

class CommentIn(BaseModel):
    photo_id: str
    text:     str
    rating:   Optional[int] = None

@router.post("/")
def add_comment(body: CommentIn, user=Depends(current_user)):
    p = db.photo_by_id(body.photo_id)
    if not p: raise HTTPException(404, "Photo not found")
    if body.rating is not None and body.rating not in range(1, 6):
        raise HTTPException(400, "Rating must be 1–5")

    db.create_comment({
        "id":         str(uuid.uuid4()),
        "photo_id":   body.photo_id,
        "user_id":    user["id"],
        "username":   user["username"],
        "text":       body.text,
        "rating":     body.rating,
        "created_at": datetime.utcnow().isoformat()
    })

    if body.rating is not None:
        all_c   = db.comments_by_photo(body.photo_id)
        ratings = [c["rating"] for c in all_c if c.get("rating")]
        p["avg_rating"]   = round(sum(ratings) / len(ratings), 2) if ratings else 0.0
        p["rating_count"] = len(ratings)

    p["comment_count"] = p.get("comment_count", 0) + 1
    db.update_photo(p)
    return {"message": "Comment added"}

@router.get("/{photo_id}")
def get_comments(photo_id: str, _=Depends(current_user)):
    return {"comments": db.comments_by_photo(photo_id)}
