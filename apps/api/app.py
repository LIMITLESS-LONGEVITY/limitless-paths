import uvicorn
import re
import sentry_sdk
from fastapi import FastAPI
from config.config import LearnHouseConfig, get_learnhouse_config
from src.core.events.events import shutdown_app, startup_app
from src.router import v1_router
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from src.core.ee_hooks import register_ee_middlewares
from src.routers.content_files import router as content_files_router
from src.routers.local_content import router as local_content_router


class DynamicCORSMiddleware(BaseHTTPMiddleware):
    """CORS middleware that reflects matching subdomain origins."""

    def __init__(self, app, allowed_domain: str | None = None, allowed_origins: list | None = None):
        super().__init__(app)
        self.allowed_domain = allowed_domain
        self.allowed_origins = allowed_origins or []
        if allowed_domain:
            escaped = re.escape(allowed_domain.lstrip("."))
            self.pattern = re.compile(rf"^https?://([a-zA-Z0-9-]+\.)*{escaped}$")
        else:
            self.pattern = None

    def _is_allowed(self, origin: str) -> bool:
        if not origin:
            return False
        # Check explicit allowed origins first (includes localhost URLs from config)
        if origin in self.allowed_origins:
            return True
        # Always allow localhost in dev
        if origin.startswith("http://localhost"):
            return True
        # Check subdomain pattern
        if self.pattern and self.pattern.match(origin):
            return True
        return False

    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin", "")

        if request.method == "OPTIONS":
            response = Response(status_code=200)
        else:
            response = await call_next(request)

        if self._is_allowed(origin):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-CSRF-Token"

        return response


########################
# Pre-Alpha Version 0.1.0
# Author: @swve
# (c) LearnHouse 2022
########################

# Get LearnHouse Config
learnhouse_config: LearnHouseConfig = get_learnhouse_config()

# Initialize Sentry if configured
if learnhouse_config.general_config.sentry_config.dsn:
    sentry_sdk.init(
        dsn=learnhouse_config.general_config.sentry_config.dsn,
        environment=learnhouse_config.general_config.env,
        send_default_pii=False,
        enable_logs=True,
        traces_sample_rate=1.0 if learnhouse_config.general_config.development_mode else 0.5,
        profile_session_sample_rate=1.0 if learnhouse_config.general_config.development_mode else 0.5,
        profile_lifecycle="trace",
    )

# Global Config
app = FastAPI(
    title=learnhouse_config.site_name,
    description=learnhouse_config.site_description,
    docs_url="/docs" if learnhouse_config.general_config.development_mode else None,
    redoc_url="/redoc" if learnhouse_config.general_config.development_mode else None,
    version="0.1.0",
)

app.add_middleware(
    DynamicCORSMiddleware,
    allowed_domain=learnhouse_config.hosting_config.cookie_config.domain,
    allowed_origins=learnhouse_config.hosting_config.allowed_origins,
)

# Gzip Middleware (will add brotli later)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Register EE Middlewares if available
register_ee_middlewares(app)


# Events
app.add_event_handler("startup", startup_app(app))
app.add_event_handler("shutdown", shutdown_app(app))


# Static Files - use S3-aware router when S3 is enabled, otherwise serve locally
# SECURITY: Both paths use routers with access control instead of raw StaticFiles
if learnhouse_config.hosting_config.content_delivery.type == "s3api":
    app.include_router(content_files_router)
else:
    app.include_router(local_content_router)

# Global Routes
app.include_router(v1_router)


if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=learnhouse_config.hosting_config.port,
        reload=learnhouse_config.general_config.development_mode,
    )


# General Routes
@app.get("/")
async def root():
    return {"Message": "Welcome to LearnHouse ✨"}
