import time
from fastapi import APIRouter, Response, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.models import Camera
from app.services.video_streamer import video_file_streamer, CAM_VIDEO_MAP
from app.services.demo_engine import demo_engine
from app.data.frames import dataset_frame_provider
from app.core.config import settings

router = APIRouter(prefix="/stream", tags=["Video Stream"])


def _camera_exists(camera_code: str) -> bool:
    db: Session = SessionLocal()
    try:
        return (
            db.query(Camera)
            .filter(Camera.code == camera_code.upper())
            .first()
            is not None
        )
    finally:
        db.close()


def video_frame_generator(camera_code: str):
    cam_upper = camera_code.upper()
    is_real_video = cam_upper in CAM_VIDEO_MAP or cam_upper.startswith("CAM-")
    has_real_data = dataset_frame_provider.has_data(camera_code)
    while True:
        frame_bytes = None
        if is_real_video:
            frame_bytes = video_file_streamer.get_frame(cam_upper)
        elif has_real_data:
            frame_bytes = dataset_frame_provider.render_jpeg(camera_code)
        if frame_bytes is None:
            frame_bytes = demo_engine.generate_jpeg_frame(camera_code)
        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
        )
        time.sleep(0.04)  # ~24 FPS smooth video playback


@router.get("/{camera_code}")
def get_video_stream(camera_code: str):
    camera_code = camera_code.upper().replace(" ", "-")
    if not _camera_exists(camera_code) and not camera_code.startswith("CAM-"):
        pass
    headers = {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
    }
    return StreamingResponse(
        video_frame_generator(camera_code),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers=headers,
    )


@router.get("/{camera_code}/frame")
def get_single_frame(camera_code: str):
    camera_code = camera_code.upper().replace(" ", "-")
    frame_bytes = None
    if camera_code in CAM_VIDEO_MAP or camera_code.startswith("CAM-"):
        frame_bytes = video_file_streamer.get_frame(camera_code)
    elif dataset_frame_provider.has_data(camera_code):
        frame_bytes = dataset_frame_provider.render_jpeg(camera_code)
    if frame_bytes is None:
        frame_bytes = demo_engine.generate_jpeg_frame(camera_code)
    return Response(
        content=frame_bytes,
        media_type="image/jpeg",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )