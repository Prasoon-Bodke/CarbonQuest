from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import uuid
import time
from app.core.config import settings
from app.core.logging import setup_logging
from app.core.errors import AppError, create_error_response
from app.db.base import Base
from app.db.session import engine
from app.api.v1.router import v1_router
from app.ai.router import router as ai_router

setup_logging()

# Ensure tables exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CarbonQuest API",
    description="Deterministic carbon engine and adaptive sustainability intelligence platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

# Global Request ID and Timing Middleware
@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = req_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = req_id
    return response

# Standard App Error Envelope Exception Handlers
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return create_error_response(
        code=exc.code,
        message=exc.message,
        status_code=exc.status_code,
        details=exc.details,
        request_id=req_id,
    )

@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    details = [
        {"field": ".".join(str(loc) for loc in err["loc"]), "issue": err["msg"]}
        for err in exc.errors()
    ]
    return create_error_response(
        code="VALIDATION_ERROR",
        message="Request validation failed",
        status_code=422,
        details=details,
        request_id=req_id,
    )

# Mount Routes under /api/v1
app.include_router(v1_router, prefix="/api/v1")

# Mount AI Router under /api/v1 (T2 mounts T3 router, T3 never touches main.py)
app.include_router(ai_router, prefix="/api/v1")
