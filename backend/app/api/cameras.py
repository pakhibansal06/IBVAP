from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Camera
from app.schemas.schemas import CameraOut, CameraCreate

router = APIRouter(prefix="/cameras", tags=["Cameras"])


@router.get("", response_model=List[CameraOut])
def get_cameras(db: Session = Depends(get_db)):
    cameras = (
        db.query(Camera)
        .filter(Camera.code.like("CAM-%"))
        .order_by(Camera.code.asc())
        .all()
    )
    return cameras


@router.get("/{camera_code}", response_model=CameraOut)
def get_camera_by_code(camera_code: str, db: Session = Depends(get_db)):
    cam = db.query(Camera).filter(Camera.code == camera_code.upper()).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    return cam


@router.post("", response_model=CameraOut, status_code=201)
def create_camera(payload: CameraCreate, db: Session = Depends(get_db)):
    existing = db.query(Camera).filter(Camera.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Camera code already exists")
    cam = Camera(**payload.model_dump())
    db.add(cam)
    db.commit()
    db.refresh(cam)
    return cam