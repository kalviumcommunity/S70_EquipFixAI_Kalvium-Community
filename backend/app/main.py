import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database.session import engine
from app.database.base import Base
# Import all models to ensure metadata is registered
import app.models
from app.routers import (
    auth, machines, incidents, work_orders, maintenance,
    parts, documents, notifications, audit_logs, analytics, users, ws, ai,
    reports, search, upload
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables automatically if connection succeeds
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    logger.warning(f"Could not connect to database on startup (will retry on requests): {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="EquipFixAI Industrial Equipment Maintenance & Troubleshooting Platform API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware configuration
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Mount Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(machines.router, prefix=settings.API_V1_STR)
app.include_router(incidents.router, prefix=settings.API_V1_STR)
app.include_router(work_orders.router, prefix=settings.API_V1_STR)
app.include_router(maintenance.router, prefix=settings.API_V1_STR)
app.include_router(parts.router, prefix=settings.API_V1_STR)
app.include_router(documents.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)
app.include_router(audit_logs.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(ws.router, prefix=settings.API_V1_STR)
app.include_router(ai.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(search.router, prefix=settings.API_V1_STR)
app.include_router(upload.router, prefix=settings.API_V1_STR)
app.include_router(upload.uploads_router, prefix=settings.API_V1_STR)


@app.get("/api/health", tags=["Health Check"])
def health_check():
    """Health status check endpoint."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0"
    }
