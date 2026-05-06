import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager


def seed_defaults():
    """Auto-create default accounts on first startup."""
    try:
        from services import cosmos_service as db
        from passlib.context import CryptContext
        from datetime import datetime
        pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

        if not db.user_by_email("admin@lumina.com"):
            db.create_user({
                "id":            "default-creator-001",
                "username":      "Admin",
                "email":         "admin@lumina.com",
                "password_hash": pwd.hash("Admin123!"),
                "role":          "Admin",
                "created_at":    datetime.utcnow().isoformat()
            })

        if not db.user_by_email("user@lumina.com"):
            db.create_user({
                "id":            "default-consumer-001",
                "username":      "User",
                "email":         "user@lumina.com",
                "password_hash": pwd.hash("User123!"),
                "role":          "User",
                "created_at":    datetime.utcnow().isoformat()
            })

        print("✓ Default accounts ready")
    except Exception as e:
        print(f"Seed note: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_defaults()
    yield


from routes import auth, photos, comments

app = FastAPI(title="PixelDen", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routes ────────────────────────────────
app.include_router(auth.router,     prefix="/auth",     tags=["Auth"])
app.include_router(photos.router,   prefix="/photos",   tags=["Photos"])
app.include_router(comments.router, prefix="/comments", tags=["Comments"])

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "PixelDen"}

# ── Serve frontend static files ───────────────
# HTML pages served as routes
@app.get("/")
def serve_login():
    return FileResponse("static/login.html")

@app.get("/login")
def login_page():
    return FileResponse("static/login.html")

@app.get("/browse")
def browse_page():
    return FileResponse("static/index.html")

@app.get("/photo")
def photo_page():
    return FileResponse("static/photo.html")

@app.get("/studio")
def studio_page():
    return FileResponse("static/creator.html")

# Mount CSS/JS/assets
app.mount("/static", StaticFiles(directory="static"), name="static")
