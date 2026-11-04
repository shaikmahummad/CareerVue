from __future__ import annotations

import os

STUDENT_EMAIL = os.getenv("E2E_STUDENT_EMAIL", "student@example.test")
STUDENT_PASSWORD = os.getenv("E2E_STUDENT_PASSWORD", "TestStudent123!")
TUTOR_EMAIL = os.getenv("E2E_TUTOR_EMAIL", "tutor@example.test")
TUTOR_PASSWORD = os.getenv("E2E_TUTOR_PASSWORD", "TestTutor123!")
BASE_URL = os.getenv("WEB_BASE_URL", "http://localhost:3000").rstrip("/")

VIEWPORTS = [
    ("Mobile iPhone 12", 390, 844),
    ("Tablet iPad Air", 820, 1180),
    ("Desktop Full HD", 1920, 1080),
    ("Laptop HD", 1366, 768),
]

PUBLIC_ROUTES = [
    ("/", "Landing Page"),
    ("/login", "Sign In Page"),
    ("/register", "Registration Page"),
    ("/forgot-password", "Forgot Password Page"),
    ("/reset-password", "Reset Password Page"),
    ("/verify-email", "Email Verification Page"),
]

PROTECTED_ROUTES = [
    ("/dashboard", "Student Dashboard"),
    ("/courses", "Courses Catalog"),
    ("/quiz", "Student Quiz Assessment"),
    ("/roadmap", "Career Roadmap"),
    ("/analytics", "Learning Analytics"),
    ("/profile", "Student Profile"),
    ("/settings", "Account Settings"),
    ("/tutor/dashboard", "Tutor Dashboard"),
    ("/tutor/courses", "Tutor Courses"),
    ("/tutor/courses/new", "Course Creation"),
    ("/tutor/analytics", "Tutor Analytics"),
    ("/tutor/profile", "Tutor Profile"),
    ("/tutor/settings", "Tutor Settings"),
    ("/admin/dashboard", "Admin Dashboard"),
    ("/admin/users", "Admin Users Management"),
    ("/admin/courses", "Admin Course Management"),
    ("/admin/approvals", "Admin Tutor Approvals"),
    ("/admin/analytics", "Admin Analytics"),
    ("/admin/settings", "Admin Settings"),
]

