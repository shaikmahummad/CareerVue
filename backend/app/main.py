from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(
    title="CareerVue API",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
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
