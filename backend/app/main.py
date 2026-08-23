import asyncio
from contextlib import asynccontextmanager, suppress
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import AsyncSessionLocal, Base, engine
from app.services.quiz_maintenance_service import mark_abandoned_attempts
import app.models  # noqa — registers all ORM models before create_all
from app.routers import (
    auth,
    students,
    tutors,
    courses,
    quiz,
    roadmap,
    enrollments,
    payments,
    admin,
    notifications,
)


logger = logging.getLogger(__name__)


async def _quiz_cleanup_loop() -> None:
    while True:
        try:
            async with AsyncSessionLocal() as session:
                changed = await mark_abandoned_attempts(session)
            if changed:
                logger.info("Marked %s abandoned quiz attempt(s)", changed)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Quiz attempt cleanup failed")
        await asyncio.sleep(settings.quiz_cleanup_interval_secs)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        print(f"[startup] DB init skipped: {e}")
    cleanup_task = (
        asyncio.create_task(_quiz_cleanup_loop())
        if settings.quiz_cleanup_enabled
        else None
    )
    yield
    if cleanup_task:
        cleanup_task.cancel()
        with suppress(asyncio.CancelledError):
            await cleanup_task
    await engine.dispose()


app = FastAPI(
    title="CareerVue API",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

LOCAL_DEVELOPMENT_ORIGINS = {
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
}

# Keep local web/Expo development usable even when a deployment-level
# APP_CORS_ORIGINS variable replaces the defaults from backend/.env.
allowed_origins = sorted(set(settings.cors_origins) | LOCAL_DEVELOPMENT_ORIGINS)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = "/api/v1"
app.include_router(auth.router, prefix=PREFIX)
app.include_router(students.router, prefix=PREFIX)
app.include_router(tutors.router, prefix=PREFIX)
app.include_router(courses.router, prefix=PREFIX)
app.include_router(quiz.router, prefix=PREFIX)
app.include_router(roadmap.router, prefix=PREFIX)
app.include_router(enrollments.router, prefix=PREFIX)
app.include_router(payments.router, prefix=PREFIX)
app.include_router(admin.router, prefix=PREFIX)
app.include_router(notifications.router, prefix=PREFIX)


@app.get("/")
async def root():
    return {"status": "CareerVue API running", "version": "2.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}
