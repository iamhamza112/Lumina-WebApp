from azure.storage.blob import BlobServiceClient, ContentSettings
import config, uuid, os

def upload_image(data: bytes, filename: str, content_type: str) -> str:
    ext       = os.path.splitext(filename)[1] or ".jpg"
    blob_name = f"{uuid.uuid4()}{ext}"
    client    = BlobServiceClient.from_connection_string(config.BLOB_CONNECTION)
    container = client.get_container_client(config.BLOB_CONTAINER)
    container.upload_blob(
        name=blob_name, data=data, overwrite=True,
        content_settings=ContentSettings(content_type=content_type)
    )
    return f"https://{client.account_name}.blob.core.windows.net/{config.BLOB_CONTAINER}/{blob_name}"

def delete_image(blob_url: str):
    try:
        blob_name = blob_url.split(f"/{config.BLOB_CONTAINER}/")[-1]
        BlobServiceClient.from_connection_string(config.BLOB_CONNECTION) \
            .get_container_client(config.BLOB_CONTAINER).delete_blob(blob_name)
    except Exception as e:
        print(f"Blob delete: {e}")
