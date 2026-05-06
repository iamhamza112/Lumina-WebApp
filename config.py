import os

COSMOS_URL      = os.getenv("COSMOS_URL", "")
COSMOS_KEY      = os.getenv("COSMOS_KEY", "")
COSMOS_DB       = os.getenv("COSMOS_DB",  "photoshare")

BLOB_CONNECTION = os.getenv("BLOB_CONNECTION", "")
BLOB_CONTAINER  = os.getenv("BLOB_CONTAINER",  "photos")

SECRET_KEY      = os.getenv("SECRET_KEY", "dev-secret-change-this")
JWT_ALGORITHM   = "HS256"
JWT_EXPIRE_MINS = 60 * 24
