"""create application baseline

Revision ID: 9f8e7d6c5b4a
Revises:
Create Date: 2026-08-24

"""
from alembic import op


revision = "9f8e7d6c5b4a"
down_revision = None
branch_labels = None
depends_on = None


CREATE_STATEMENTS = (
    """
    CREATE TABLE profiles (
        id UUID PRIMARY KEY,
        role TEXT NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        avatar_url TEXT,
        phone TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
    )
    """,
    """
    CREATE TABLE quiz_templates (
        id UUID PRIMARY KEY,
        goal TEXT NOT NULL,
        topic_areas TEXT[],
        questions JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
    )
    """,
    """
    CREATE TABLE courses (
        id UUID PRIMARY KEY,
        tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        thumbnail_url TEXT,
        category TEXT,
        tags TEXT[],
        price NUMERIC DEFAULT 0.00,
        is_free BOOLEAN GENERATED ALWAYS AS (price = 0) STORED,
        level TEXT,
        duration_hours NUMERIC,
        language TEXT DEFAULT 'English',
        status TEXT DEFAULT 'draft',
        rejection_note TEXT,
        enrolled_count INTEGER DEFAULT 0,
        avg_rating NUMERIC DEFAULT 0.00,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT courses_status_check
            CHECK (status IN ('draft', 'approved', 'rejected'))
    )
    """,
    """
    CREATE TABLE notifications (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        type TEXT,
        title TEXT NOT NULL,
        body TEXT,
        is_read BOOLEAN DEFAULT false,
        link TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
    )
    """,
    """
    CREATE TABLE students (
        id UUID PRIMARY KEY,
        profile_id UUID NOT NULL UNIQUE
            REFERENCES profiles(id) ON DELETE CASCADE,
        college_name TEXT,
        branch TEXT,
        year_of_study INTEGER,
        graduation_year INTEGER,
        city TEXT,
        linkedin_url TEXT,
        github_url TEXT,
        current_goal TEXT,
        xp_points INTEGER DEFAULT 0,
        streak_days INTEGER DEFAULT 0,
        last_active_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
    )
    """,
    """
    CREATE TABLE tutors (
        id UUID PRIMARY KEY,
        profile_id UUID NOT NULL UNIQUE
            REFERENCES profiles(id) ON DELETE CASCADE,
        bio TEXT,
        expertise_tags TEXT[],
        qualification TEXT,
        experience_years INTEGER,
        linkedin_url TEXT,
        website_url TEXT,
        is_verified BOOLEAN DEFAULT false,
        total_earnings NUMERIC DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now()
    )
    """,
    """
    CREATE TABLE certificates (
        id UUID PRIMARY KEY,
        student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        certificate_url TEXT,
        issued_at TIMESTAMPTZ DEFAULT now()
    )
    """,
    """
    CREATE TABLE course_approvals (
        id UUID PRIMARY KEY,
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
        status TEXT NOT NULL,
        notes TEXT,
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
    )
    """,
    """
    CREATE TABLE course_modules (
        id UUID PRIMARY KEY,
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        video_url TEXT,
        pdf_url TEXT,
        duration_mins INTEGER,
        order_index INTEGER NOT NULL,
        is_preview BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now()
    )
    """,
    """
    CREATE TABLE enrollments (
        id UUID PRIMARY KEY,
        student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        enrolled_at TIMESTAMPTZ DEFAULT now(),
        completed_at TIMESTAMPTZ,
        progress_pct INTEGER DEFAULT 0
    )
    """,
    """
    CREATE TABLE payments (
        id UUID PRIMARY KEY,
        student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        amount NUMERIC NOT NULL,
        currency TEXT DEFAULT 'INR',
        status TEXT DEFAULT 'pending',
        payment_gateway TEXT,
        gateway_payment_id TEXT,
        gateway_order_id TEXT,
        paid_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
    )
    """,
    """
    CREATE TABLE quiz_attempts (
        id UUID PRIMARY KEY,
        student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        quiz_id UUID NOT NULL REFERENCES quiz_templates(id) ON DELETE CASCADE,
        answers JSONB NOT NULL DEFAULT '[]'::jsonb,
        score INTEGER,
        total_questions INTEGER,
        time_taken_secs INTEGER,
        completed_at TIMESTAMPTZ DEFAULT now()
    )
    """,
    """
    CREATE TABLE reviews (
        id UUID PRIMARY KEY,
        student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL,
        comment TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
    )
    """,
    """
    CREATE TABLE skill_profiles (
        id UUID PRIMARY KEY,
        student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        topic TEXT NOT NULL,
        level TEXT NOT NULL,
        score_percent INTEGER NOT NULL,
        assessed_at TIMESTAMPTZ DEFAULT now()
    )
    """,
    """
    CREATE TABLE discussions (
        id UUID PRIMARY KEY,
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        module_id UUID REFERENCES course_modules(id) ON DELETE SET NULL,
        author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        parent_id UUID REFERENCES discussions(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
    )
    """,
    """
    CREATE TABLE module_progress (
        id UUID PRIMARY KEY,
        enrollment_id UUID NOT NULL
            REFERENCES enrollments(id) ON DELETE CASCADE,
        module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
        completed_at TIMESTAMPTZ DEFAULT now()
    )
    """,
    """
    CREATE TABLE roadmaps (
        id UUID PRIMARY KEY,
        student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        goal TEXT NOT NULL,
        title TEXT,
        is_active BOOLEAN DEFAULT true,
        completion_pct INTEGER DEFAULT 0,
        generated_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
    )
    """,
    """
    CREATE TABLE roadmap_courses (
        id UUID PRIMARY KEY,
        roadmap_id UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE SET NULL,
        topic TEXT NOT NULL,
        reason TEXT,
        priority INTEGER,
        recommended_course_type TEXT,
        search_keywords TEXT[],
        status TEXT DEFAULT 'pending',
        order_index INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT roadmap_courses_roadmap_id_course_id_key
            UNIQUE (roadmap_id, course_id)
    )
    """,
)


DROP_ORDER = (
    "roadmap_courses",
    "roadmaps",
    "module_progress",
    "discussions",
    "skill_profiles",
    "reviews",
    "quiz_attempts",
    "payments",
    "enrollments",
    "course_modules",
    "course_approvals",
    "certificates",
    "tutors",
    "students",
    "notifications",
    "courses",
    "quiz_templates",
    "profiles",
)


def upgrade() -> None:
    for statement in CREATE_STATEMENTS:
        op.execute(statement)


def downgrade() -> None:
    for table_name in DROP_ORDER:
        op.drop_table(table_name)
