from azure.cosmos import CosmosClient, exceptions
import config

_client = None
_db     = None

def _get_db():
    global _client, _db
    if _db is None:
        _client = CosmosClient(config.COSMOS_URL, config.COSMOS_KEY)
        _db     = _client.get_database_client(config.COSMOS_DB)
    return _db

def container(name):
    return _get_db().get_container_client(name)

def create_user(u):    return container("users").create_item(u)

def user_by_email(email):
    items = list(container("users").query_items(
        "SELECT * FROM c WHERE c.email=@e",
        parameters=[{"name": "@e", "value": email}],
        enable_cross_partition_query=True
    ))
    return items[0] if items else None

def user_by_id(uid):
    try:    return container("users").read_item(uid, partition_key=uid)
    except exceptions.CosmosResourceNotFoundError: return None

def create_photo(p):   return container("photos").create_item(p)
def update_photo(p):   return container("photos").replace_item(p["id"], p)
def delete_photo(pid): container("photos").delete_item(pid, partition_key=pid)

def photo_by_id(pid):
    try:    return container("photos").read_item(pid, partition_key=pid)
    except exceptions.CosmosResourceNotFoundError: return None

def list_photos(skip=0, limit=12):
    items = list(container("photos").query_items(
        f"SELECT * FROM c ORDER BY c.uploaded_at DESC OFFSET {skip} LIMIT {limit+1}",
        enable_cross_partition_query=True
    ))
    return items[:limit], len(items) > limit

def search_photos(q, skip=0, limit=12):
    items = list(container("photos").query_items(
        """SELECT * FROM c
           WHERE CONTAINS(LOWER(c.title),@q)
              OR CONTAINS(LOWER(c.location),@q)
           ORDER BY c.uploaded_at DESC
           OFFSET @s LIMIT @l""",
        parameters=[
            {"name": "@q", "value": q.lower()},
            {"name": "@s", "value": skip},
            {"name": "@l", "value": limit + 1}
        ],
        enable_cross_partition_query=True
    ))
    return items[:limit], len(items) > limit

def photos_by_creator(cid):
    return list(container("photos").query_items(
        "SELECT * FROM c WHERE c.creator_id=@c ORDER BY c.uploaded_at DESC",
        parameters=[{"name": "@c", "value": cid}],
        enable_cross_partition_query=True
    ))

def create_comment(c): return container("comments").create_item(c)

def comments_by_photo(pid):
    return list(container("comments").query_items(
        "SELECT * FROM c WHERE c.photo_id=@p ORDER BY c.created_at DESC",
        parameters=[{"name": "@p", "value": pid}],
        enable_cross_partition_query=True
    ))
