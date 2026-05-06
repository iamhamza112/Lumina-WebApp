from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
import uuid, config
from services import cosmos_service as db

router  = APIRouter()
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer  = HTTPBearer()

class RegisterIn(BaseModel):
    username: str
    email:    str
    password: str

class LoginIn(BaseModel):
    email:    str
    password: str

def make_token(uid, role):
    return jwt.encode(
        {"sub": uid, "role": role,
         "exp": datetime.utcnow() + timedelta(minutes=config.JWT_EXPIRE_MINS)},
        config.SECRET_KEY, algorithm=config.JWT_ALGORITHM
    )

def decode_token(token):
    try:    return jwt.decode(token, config.SECRET_KEY, algorithms=[config.JWT_ALGORITHM])
    except JWTError: raise HTTPException(401, "Invalid or expired token")

def current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    payload = decode_token(creds.credentials)
    user    = db.user_by_id(payload["sub"])
    if not user: raise HTTPException(401, "User not found")
    return user

def require_creator(user=Depends(current_user)):
    if user["role"] != "creator": raise HTTPException(403, "Creator access required")
    return user

def require_consumer(user=Depends(current_user)):
    if user["role"] != "consumer": raise HTTPException(403, "Consumer access required")
    return user

@router.post("/register")
def register(body: RegisterIn):
    if len(body.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    if db.user_by_email(body.email.lower()):
        raise HTTPException(400, "Email already registered")
    db.create_user({
        "id":            str(uuid.uuid4()),
        "username":      body.username,
        "email":         body.email.lower(),
        "password_hash": pwd_ctx.hash(body.password[:72]),
        "role":          "consumer",
        "created_at":    datetime.utcnow().isoformat()
    })
    return {"message": "Account created"}

@router.post("/login")
def login(body: LoginIn):
    user = db.user_by_email(body.email.lower())
    if not user or not pwd_ctx.verify(body.password[:72], user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    return {
        "access_token": make_token(user["id"], user["role"]),
        "token_type":   "bearer",
        "role":         user["role"],
        "username":     user["username"],
        "user_id":      user["id"]
    }

@router.get("/me")
def me(user=Depends(current_user)):
    return {k: user[k] for k in ("id", "username", "email", "role")}
