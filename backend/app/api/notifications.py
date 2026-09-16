from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import Notification
from app.schemas.schemas import NotificationOut

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationOut])
def get_notifications(
    channel: Optional[str] = Query(None, description="Filter by channel: IN_APP, EMAIL, SMS"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(Notification)
    if channel:
        query = query.filter(Notification.channel == channel.upper())
    return query.order_by(Notification.timestamp.desc()).limit(limit).all()