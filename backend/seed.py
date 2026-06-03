"""
Seed script — inserts approved courses + modules into the database.
Run from the backend directory:
    python seed.py
"""
import asyncio
import uuid
from dotenv import load_dotenv

load_dotenv()

from app.database import AsyncSessionLocal
from app.models.user import Profile, Tutor
from sqlalchemy import select, text

COURSES = [
    {
        "title": "Complete Python Bootcamp",
        "description": "Master Python from scratch to advanced. Covers OOP, file handling, APIs, and data analysis with real projects.",
        "category": "Programming",
        "level": "beginner",
        "is_free": True,
        "price": 0.0,
        "language": "English",
        "duration_hours": 18.0,
        "tags": ["Python", "Programming", "Backend"],
        "thumbnail_url": None,
        "modules": [
            ("Python Basics & Setup",        "Variables, data types, operators, and your first Python program.", 45),
            ("Control Flow & Loops",          "if/else, for loops, while loops, and list comprehensions.",         40),
            ("Functions & Modules",           "Defining functions, *args/**kwargs, imports, and the stdlib.",      50),
            ("Object-Oriented Programming",   "Classes, inheritance, dunder methods, and design patterns.",        60),
            ("File I/O & Error Handling",     "Reading/writing files, try/except, and context managers.",          35),
        ],
    },
    {
        "title": "React & TypeScript Masterclass",
        "description": "Build production-ready web apps with React 18 and TypeScript. Hooks, state management, testing, and deployment.",
        "category": "Programming",
        "level": "intermediate",
        "is_free": False,
        "price": 999.0,
        "language": "English",
        "duration_hours": 22.0,
        "tags": ["React", "TypeScript", "Frontend", "JavaScript"],
        "thumbnail_url": None,
        "modules": [
            ("TypeScript Fundamentals",        "Types, interfaces, generics, and TypeScript with React.",          55),
            ("React Hooks Deep Dive",          "useState, useEffect, useCallback, useMemo, and custom hooks.",     65),
            ("State Management with Zustand",  "Global state, slices, devtools, and async actions.",               50),
            ("React Query & Data Fetching",    "Caching, invalidation, optimistic updates, and pagination.",       60),
            ("Testing with Vitest & RTL",      "Unit tests, integration tests, and testing best practices.",       45),
        ],
    },
    {
        "title": "Node.js Backend Development",
        "description": "Build scalable REST APIs with Node.js, Express, and PostgreSQL. Auth, file uploads, and deployment covered.",
        "category": "Programming",
        "level": "intermediate",
        "is_free": False,
        "price": 799.0,
        "language": "English",
        "duration_hours": 16.0,
        "tags": ["Node.js", "Express", "Backend", "REST API"],
        "thumbnail_url": None,
        "modules": [
            ("Node.js & Express Basics",       "Routing, middleware, request/response lifecycle.",                 40),
            ("Database with PostgreSQL",        "pg, connection pools, queries, and migrations.",                  55),
            ("Authentication & JWT",            "Signup/login flow, JWT tokens, refresh tokens, bcrypt.",          60),
            ("File Uploads & Cloud Storage",    "Multer, S3 integration, and image processing.",                   40),
            ("Deployment on Railway/Render",    "Environment variables, CI/CD, and production best practices.",    30),
        ],
    },
    {
        "title": "Data Science with Python",
        "description": "From data cleaning to machine learning. Pandas, NumPy, Matplotlib, Scikit-learn and real-world datasets.",
        "category": "Data Science",
        "level": "beginner",
        "is_free": True,
        "price": 0.0,
        "language": "English",
        "duration_hours": 20.0,
        "tags": ["Python", "Data Science", "Machine Learning", "Pandas"],
        "thumbnail_url": None,
        "modules": [
            ("NumPy & Pandas Fundamentals",    "Arrays, DataFrames, indexing, groupby, and merges.",               60),
            ("Data Visualisation",              "Matplotlib, Seaborn, and building publication-ready charts.",      50),
            ("Exploratory Data Analysis",       "EDA workflow, correlation, outlier detection, feature engineering.",55),
            ("Machine Learning with Sklearn",   "Linear regression, decision trees, cross-validation, pipelines.", 70),
            ("Capstone: Predicting House Prices","End-to-end ML project from raw data to deployed model.",         60),
        ],
    },
    {
        "title": "DevOps & Cloud Engineering",
        "description": "Docker, Kubernetes, CI/CD pipelines, and cloud deployments on AWS. Everything you need to ship like a pro.",
        "category": "DevOps",
        "level": "advanced",
        "is_free": False,
        "price": 1299.0,
        "language": "English",
        "duration_hours": 24.0,
        "tags": ["Docker", "Kubernetes", "AWS", "CI/CD", "DevOps"],
        "thumbnail_url": None,
        "modules": [
            ("Docker & Containerisation",      "Images, containers, volumes, networks, and Docker Compose.",       60),
            ("Kubernetes Fundamentals",        "Pods, deployments, services, ingress, and Helm charts.",           80),
            ("CI/CD with GitHub Actions",      "Pipelines, matrix builds, secrets, and automated deployments.",   55),
            ("AWS Core Services",              "EC2, S3, RDS, IAM, VPC, and cost optimisation basics.",            70),
            ("Monitoring with Prometheus",      "Metrics, alerts, Grafana dashboards, and SLO tracking.",          45),
        ],
    },
    {
        "title": "UI/UX Design Fundamentals",
        "description": "Learn the principles of great design: typography, colour theory, Figma, wireframing, and user research.",
        "category": "Design",
        "level": "beginner",
        "is_free": True,
        "price": 0.0,
        "language": "English",
        "duration_hours": 12.0,
        "tags": ["Design", "Figma", "UI", "UX"],
        "thumbnail_url": None,
        "modules": [
            ("Design Principles",              "Hierarchy, contrast, alignment, proximity, and white space.",       40),
            ("Colour Theory & Typography",     "Colour palettes, font pairing, and accessibility standards.",       45),
            ("Figma Crash Course",             "Frames, components, auto-layout, prototyping, and handoff.",        60),
            ("User Research & Wireframing",    "Personas, user journeys, low-fi wireframes, and usability tests.", 55),
        ],
    },
    {
        "title": "Cybersecurity Essentials",
        "description": "Understand threats, vulnerabilities, and how to defend systems. Covers OWASP Top 10, pentesting basics, and network security.",
        "category": "Cybersecurity",
        "level": "intermediate",
        "is_free": False,
        "price": 899.0,
        "language": "English",
        "duration_hours": 15.0,
        "tags": ["Cybersecurity", "Ethical Hacking", "Network Security"],
        "thumbnail_url": None,
        "modules": [
            ("Networking & Protocols",         "TCP/IP, DNS, HTTP/S, firewalls, and VPNs explained.",              50),
            ("OWASP Top 10",                   "SQL injection, XSS, CSRF, broken auth, and how to fix them.",      60),
            ("Linux for Security",             "Permissions, processes, logs, and Bash scripting for defenders.",  50),
            ("Penetration Testing Basics",     "Recon, scanning, exploitation with Metasploit, and reporting.",    70),
        ],
    },
    {
        "title": "Full Stack with Next.js",
        "description": "Build and deploy full-stack apps with Next.js 14, Prisma, PostgreSQL, and Vercel. App Router and Server Actions included.",
        "category": "Programming",
        "level": "advanced",
        "is_free": False,
        "price": 1099.0,
        "language": "English",
        "duration_hours": 19.0,
        "tags": ["Next.js", "Full Stack", "React", "PostgreSQL"],
        "thumbnail_url": None,
        "modules": [
            ("Next.js App Router",             "Layouts, pages, loading states, error boundaries, and metadata.",  55),
            ("Server Components & Actions",    "RSC model, Server Actions, form handling, and revalidation.",      60),
            ("Prisma ORM & PostgreSQL",        "Schema design, migrations, relations, and raw queries.",            55),
            ("Auth with NextAuth.js",          "OAuth providers, credentials, session handling, and middleware.",   50),
            ("Deployment & Edge Functions",    "Vercel deploy, edge runtime, ISR, and performance optimisation.",  40),
        ],
    },
]


async def seed():
    async with AsyncSessionLocal() as db:
        # Find a tutor row (tutors.id is the FK used by courses.tutor_id)
        tutor_row = (await db.execute(
            select(Tutor, Profile)
            .join(Profile, Tutor.profile_id == Profile.id)
            .limit(1)
        )).first()

        if not tutor_row:
            print("ERROR: No tutor found. Register a tutor account first.")
            return

        tutor, tutor_profile = tutor_row
        print(f"Seeding courses as tutor: {tutor_profile.full_name} (tutors.id={tutor.id})")

        created = 0
        for c in COURSES:
            course_id = uuid.uuid4()
            # Use raw SQL to avoid inserting into the generated `is_free` column
            await db.execute(text("""
                INSERT INTO courses
                    (id, tutor_id, title, description, category, level, price,
                     language, duration_hours, tags, thumbnail_url, status,
                     enrolled_count, avg_rating)
                VALUES
                    (:id, :tutor_id, :title, :description, :category, :level, :price,
                     :language, :duration_hours, :tags, :thumbnail_url, :status,
                     :enrolled_count, :avg_rating)
            """), {
                "id":             str(course_id),
                "tutor_id":       str(tutor.id),  # tutors.id, not profiles.id
                "title":          c["title"],
                "description":    c["description"],
                "category":       c["category"],
                "level":          c["level"],
                "price":          c["price"],
                "language":       c["language"],
                "duration_hours": c["duration_hours"],
                "tags":           c["tags"],
                "thumbnail_url":  c["thumbnail_url"],
                "status":         "approved",
                "enrolled_count": 0,
                "avg_rating":     0.0,
            })

            for i, (title, desc, dur) in enumerate(c["modules"]):
                await db.execute(text("""
                    INSERT INTO course_modules
                        (id, course_id, title, description, duration_mins,
                         order_index, is_preview)
                    VALUES
                        (:id, :course_id, :title, :description, :duration_mins,
                         :order_index, :is_preview)
                """), {
                    "id":           str(uuid.uuid4()),
                    "course_id":    str(course_id),
                    "title":        title,
                    "description":  desc,
                    "duration_mins": dur,
                    "order_index":  i,
                    "is_preview":   (i == 0),
                })

            created += 1
            print(f"  [OK] {c['title']}")

        await db.commit()
        print(f"\nDone - {created} courses seeded successfully.")


if __name__ == "__main__":
    asyncio.run(seed())
