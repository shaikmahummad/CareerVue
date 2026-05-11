import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.database import get_db
from app.models.social import Notification
from app.dependencies import CurrentUser

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/")
async def get_notifications(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    notifications = result.scalars().all()
    return {
        "success": True,
        "message": "Notifications fetched",
        "data": [
            {
                "id": str(n.id),
                "type": n.type,
                "title": n.title,
                "body": n.body,
                "is_read": n.is_read,
                "link": n.link,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in notifications
        ],
    }


@router.put("/read-all")
async def mark_all_read(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,  # noqa: E712
        )
        .values(is_read=True)
    )
    await db.commit()
    return {"success": True, "message": "All marked as read", "data": None}


@router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Notification)
        .where(
            Notification.id == uuid.UUID(notification_id),
            Notification.user_id == current_user.id,
        )
        .values(is_read=True)
    )
    await db.commit()
    return {"success": True, "message": "Marked as read", "data": None}
