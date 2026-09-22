import os
import uuid
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, status
from fastapi.responses import FileResponse
from app.models.user import User
from app.auth.deps import get_current_user

router = APIRouter(prefix="/upload", tags=["Secure File Uploads"])

# Upload directory within backend
UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Security constraints
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB limit
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf", ".txt"}
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "application/pdf",
    "text/plain"
}


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Securely upload an equipment photo, manual attachment, or work log artifact.
    Enforces strict MIME validation, file extension whitelisting, size limits, and path traversal defense.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename cannot be empty."
        )

    # 1. Path Traversal & Extension Check
    original_basename = os.path.basename(file.filename)
    ext = os.path.splitext(original_basename)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension '{ext}' is not permitted. Allowed: {sorted(list(ALLOWED_EXTENSIONS))}."
        )

    # 2. MIME Type Validation
    content_type = file.content_type or ""
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported content type '{content_type}'. Allowed MIME types: {sorted(list(ALLOWED_MIME_TYPES))}."
        )

    # 3. Read content and verify size
    contents = await file.read()
    file_size = len(contents)
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum limit of 10 MB (got {file_size / (1024*1024):.2f} MB)."
        )

    # 4. Generate randomized, safe filename to prevent overwrites and traversal attacks
    safe_filename = f"{uuid.uuid4().hex}{ext}"
    target_path = UPLOAD_DIR / safe_filename

    with open(target_path, "wb") as f:
        f.write(contents)

    return {
        "file_url": f"/api/uploads/{safe_filename}",
        "filename": safe_filename,
        "original_filename": original_basename,
        "content_type": content_type,
        "size_bytes": file_size
    }


# Retrieval endpoint for uploaded files
uploads_router = APIRouter(prefix="/uploads", tags=["Secure File Serving"])


@uploads_router.get("/{filename}")
def get_uploaded_file(filename: str):
    """Serve an uploaded file safely, preventing directory traversal."""
    # Sanitize filename
    clean_filename = os.path.basename(filename)
    file_path = UPLOAD_DIR / clean_filename

    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requested file was not found."
        )

    return FileResponse(file_path)
