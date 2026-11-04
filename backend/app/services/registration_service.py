from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import PendingRegistration, Profile, Student, Tutor


async def pending_registration_for_email(
    db: AsyncSession, email: str
) -> PendingRegistration | None:
    return (
        await db.execute(
            select(PendingRegistration)
            .where(func.lower(PendingRegistration.email) == email)
            .with_for_update()
        )
    ).scalar_one_or_none()


async def activate_pending_registration(
    db: AsyncSession,
    pending: PendingRegistration,
    profile: Profile | None = None,
) -> Profile:
    """Materialize a pending registration, including its role-specific row.

    Supabase projects may have an auth hook that creates ``profiles`` before
    the application OTP is verified. Treat that profile as a partial account
    and finish it instead of skipping the student/tutor record.
    """
    data = pending.registration_data
    if profile is not None and profile.id != pending.user_id:
        raise ValueError("Pending registration does not belong to this profile")

    if profile is None:
        profile = Profile(id=pending.user_id)
        db.add(profile)

    profile.role = pending.role
    profile.full_name = data["full_name"]
    profile.email = pending.email
    profile.phone = data.get("phone")
    profile.email_verified = True
    await db.flush()

    if pending.role == "student":
        role_row = (
            await db.execute(
                select(Student).where(Student.profile_id == pending.user_id)
            )
        ).scalar_one_or_none()
        if role_row is None:
            role_row = Student(profile_id=pending.user_id)
            db.add(role_row)
        role_row.college_name = data.get("college")
        role_row.branch = data.get("branch")
        role_row.year_of_study = data.get("year_of_study")
        role_row.graduation_year = data.get("graduation_year")
        role_row.city = data.get("city")
        role_row.linkedin_url = data.get("linkedin_url")
        role_row.github_url = data.get("github_url")
    elif pending.role == "tutor":
        role_row = (
            await db.execute(
                select(Tutor).where(Tutor.profile_id == pending.user_id)
            )
        ).scalar_one_or_none()
        if role_row is None:
            role_row = Tutor(profile_id=pending.user_id)
            db.add(role_row)
        role_row.bio = data.get("bio")
        role_row.expertise_tags = data.get("expertise_tags") or []
        role_row.qualification = data.get("qualification")
        role_row.experience_years = data.get("years_experience")
        role_row.linkedin_url = data.get("linkedin_url")
        role_row.website_url = data.get("website_url")
    else:
        raise ValueError(f"Unsupported pending registration role: {pending.role}")

    await db.delete(pending)
    return profile


async def reconcile_pending_registration(
    db: AsyncSession, profile: Profile
) -> Profile:
    """Finish a partial account left by an auth-trigger-created profile."""
    pending = (
        await db.execute(
            select(PendingRegistration)
            .where(
                PendingRegistration.user_id == profile.id,
                PendingRegistration.role == profile.role,
            )
            .with_for_update()
        )
    ).scalar_one_or_none()
    if pending is None:
        return profile
    return await activate_pending_registration(db, pending, profile)
