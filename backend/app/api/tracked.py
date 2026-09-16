from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import TrackedObject
from app.schemas.schemas import TrackedObjectOut

router = APIRouter(prefix="/tracked", tags=["Tracked Objects"])


@router.get("", response_model=List[TrackedObjectOut])
def get_tracked_objects(
    status: Optional[str] = None,
    object_class: Optional[str] = None,
    source: Optional[str] = None,
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
):
    query = db.query(TrackedObject)
    if status:
        query = query.filter(TrackedObject.status == status.upper())
    if object_class:
        query = query.filter(TrackedObject.object_class == object_class.lower())
    if source:
        query = query.filter(TrackedObject.source == source.upper())
    return query.order_by(TrackedObject.last_seen.desc()).limit(limit).all()


@router.get("/{tracking_id}", response_model=TrackedObjectOut)
def get_tracked_by_id(tracking_id: str, db: Session = Depends(get_db)):
    to = db.query(TrackedObject).filter(TrackedObject.tracking_id == tracking_id).first()
    if not to:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Tracked object not found")
    return to