from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Event
from app.schemas.schemas import EventOut

router = APIRouter(prefix="/events", tags=["Events"])


@router.get("", response_model=List[EventOut])
def get_events(
    limit: int = Query(50, le=200),
    camera_code: Optional[str] = None,
    risk_level: Optional[str] = None,
    event_type: Optional[str] = None,
    source: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Event)
    if camera_code:
        query = query.filter(Event.camera_code == camera_code.upper())
    if risk_level:
        query = query.filter(Event.risk_level == risk_level.upper())
    if event_type:
        query = query.filter(Event.event_type == event_type.upper())
    if source:
        query = query.filter(Event.source == source.upper())
    events = query.order_by(Event.timestamp.desc()).limit(limit).all()
    return events