import time
import uuid
from typing import Callable
from fastapi import FastAPI, Request, Response, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from backend.app.config import settings
from backend.app.core.logging import app_logger
from backend.app.core.exceptions import (
    FreightAppException,
    ShipmentNotFoundError,
    InvalidShipmentPayloadError,
    RoutingProviderUnavailableError,
    RailLegNotFoundError,
    OptimizationInfeasibleError
)
from backend.app.api.routes import router

app = FastAPI(
    title="Multimodal Consignment Consolidation & Cold-Chain Risk Prediction API",
    description="Deterministic physics-based risk and OR-Tools CP-SAT multimodal freight consolidation engine.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Tracing & Structured Logging Middleware
@app.middleware("http")
async def logging_and_correlation_middleware(request: Request, call_next: Callable) -> Response:
    correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
    request.state.correlation_id = correlation_id
    t_start = time.perf_counter()
    
    try:
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - t_start) * 1000.0, 2)
        response.headers["X-Correlation-ID"] = correlation_id
        
        # Log request summary
        app_logger.info(
            f"{request.method} {request.url.path} -> {response.status_code} ({duration_ms}ms)",
            extra={
                "correlation_id": correlation_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms
            }
        )
        return response
    except Exception as exc:
        duration_ms = round((time.perf_counter() - t_start) * 1000.0, 2)
        app_logger.error(
            f"Unhandled exception on {request.method} {request.url.path}: {str(exc)}",
            exc_info=True,
            extra={
                "correlation_id": correlation_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": 500,
                "duration_ms": duration_ms
            }
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "InternalServerError",
                "detail": "An unexpected server error occurred. Please contact support.",
                "correlation_id": correlation_id
            },
            headers={"X-Correlation-ID": correlation_id}
        )

# Exception Handlers
@app.exception_handler(FreightAppException)
async def freight_exception_handler(request: Request, exc: FreightAppException):
    correlation_id = getattr(request.state, "correlation_id", str(uuid.uuid4()))
    app_logger.warning(
        f"{exc.__class__.__name__}: {exc.message}",
        extra={
            "correlation_id": correlation_id,
            "status_code": exc.status_code,
            "path": request.url.path
        }
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.__class__.__name__,
            "detail": exc.detail or exc.message,
            "correlation_id": correlation_id
        },
        headers={"X-Correlation-ID": correlation_id}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    correlation_id = getattr(request.state, "correlation_id", str(uuid.uuid4()))
    errors = exc.errors()
    detail_msg = "; ".join(f"{e.get('loc', [])}: {e.get('msg', '')}" for e in errors)
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": "RequestValidationError",
            "detail": detail_msg,
            "correlation_id": correlation_id
        },
        headers={"X-Correlation-ID": correlation_id}
    )

# Attach API routes
app.include_router(router)
