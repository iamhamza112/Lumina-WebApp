from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, Query
from datetime import datetime
import uuid
from routes.auth import current_user, require_creator
from services import cosmos_service as db, blob_service

router  = APIRouter()
ALLOWED = {"image/jpeg", "image/png", "image/webp", "image/gif"}

@router.post("/upload")
async def upload(
    file:     UploadFile = File(...),
    title:    str = Form(...),
    caption:  str = Form(""),
    location: str = Form(""),
    people:   str = Form(""),
    creator=Depends(require_creator)
):
    if file.content_type not in ALLOWED:
        raise HTTPException(400, "Invalid file type.")
    raw = await file.read()
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 10MB).")

    blob_url = blob_service.upload_image(raw, file.filename, file.content_type)

    photo = {
        "id":               str(uuid.uuid4()),
        "creator_id":       creator["id"],
        "creator_username": creator["username"],
        "title":            title,
        "caption":          caption,
        "location":         location,
        "people_present":   [p.strip() for p in people.split(",") if p.strip()],
        "blob_url":         blob_url,
        "avg_rating":       0.0,
        "rating_count":     0,
        "comment_count":    0,
        "uploaded_at":      datetime.utcnow().isoformat()
    }
    created = db.create_photo(photo)
    return {"message": "Photo uploaded", "photo_id": created["id"]}

@router.get("/")
def list_all(page: int = Query(1, ge=1), limit: int = Query(12, ge=1, le=48), _=Depends(current_user)):
    photos, has_more = db.list_photos((page - 1) * limit, limit)
    return {"photos": photos, "page": page, "has_more": has_more}

@router.get("/search")
def search(q: str = Query(..., min_length=1), page: int = Query(1, ge=1), limit: int = Query(12, ge=1, le=48), _=Depends(current_user)):
    photos, has_more = db.search_photos(q, (page - 1) * limit, limit)
    return {"photos": photos, "page": page, "has_more": has_more}

@router.get("/mine")
def mine(creator=Depends(require_creator)):
    return {"photos": db.photos_by_creator(creator["id"])}

@router.get("/{photo_id}")
def get_one(photo_id: str, _=Depends(current_user)):
    p = db.photo_by_id(photo_id)
    if not p: raise HTTPException(404, "Photo not found")
    return p

@router.delete("/{photo_id}")
def delete(photo_id: str, creator=Depends(require_creator)):
    p = db.photo_by_id(photo_id)
    if not p: raise HTTPException(404, "Photo not found")
    if p["creator_id"] != creator["id"]: raise HTTPException(403, "Not your photo")
    blob_service.delete_image(p["blob_url"])
    db.delete_photo(photo_id)
    return {"message": "Photo deleted"}
