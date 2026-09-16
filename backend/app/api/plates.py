from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Plate
from app.schemas.schemas import PlateOut

router = APIRouter(prefix="/plates", tags=["ANPR / Plates"])


@router.get("", response_model=List[PlateOut])
def get_plates(
    wanted_only: bool = False,
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
):
    query = db.query(Plate)
    if wanted_only:
        query = query.filter(Plate.is_wanted == True)
    return query.order_by(Plate.timestamp.desc()).limit(limit).all()