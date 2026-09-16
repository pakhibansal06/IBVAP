from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.demo_engine import demo_engine
from app.schemas.schemas import SeedingStatus

router = APIRouter(prefix="/demo", tags=["Demo Mode Simulator"])

VALID_SCENARIOS = [
    "NIGHT_INTRUSION",
    "VIRTUAL_FENCE",
    "ANPR_WANTED",
    "CROSS_CAMERA_PURSUIT",
]


@router.post("/trigger")
def trigger_demo_scenario(
    scenario: str = Query(
        ...,
        description="Scenario type: NIGHT_INTRUSION, VIRTUAL_FENCE, ANPR_WANTED, CROSS_CAMERA_PURSUIT",
    ),
    db: Session = Depends(get_db),
):
    scenario_upper = scenario.upper()
    # Accept the frontend's scenario ids too (fence_breach, hotlist_vehicle, drone_threat, river_incursion)
    mapping = {
        "fence_breach": "VIRTUAL_FENCE",
        "hotlist_vehicle": "ANPR_WANTED",
        "drone_threat": "NIGHT_INTRUSION",
        "river_incursion": "CROSS_CAMERA_PURSUIT",
    }
    resolved = mapping.get(scenario_upper.lower(), scenario_upper)

    if resolved not in VALID_SCENARIOS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid scenario. Choose from {VALID_SCENARIOS}",
        )
    result = demo_engine.trigger_scenario(resolved, db)
    return result


@router.post("/seed", response_model=SeedingStatus)
def seed_datasets_endpoint(db: Session = Depends(get_db)):
    """On-demand endpoint to seed VIRAT/MOT17 dataset data (idempotent)."""
    from pathlib import Path
    from app.core.config import settings
    from app.data.virat import ingest_virat
    from app.data.mot17 import ingest_mot17

    cache_dir = Path(settings.DATA_CACHE_DIR)
    cache_dir.mkdir(parents=True, exist_ok=True)
    virat_counts = ingest_virat(db, cache_dir, settings.DATASET_VIRAT_MAX_CLIPS)
    mot17_counts = ingest_mot17(db, cache_dir, settings.DATASET_MOT17_SEQUENCES)
    return {
        "status": "seeded",
        "cameras": virat_counts["cameras"] + mot17_counts["cameras"],
        "detections": virat_counts["detections"] + mot17_counts["detections"],
        "tracked_objects": virat_counts["tracked_objects"] + mot17_counts["tracked_objects"],
        "events": virat_counts["events"] + mot17_counts["events"],
        "alerts": virat_counts["alerts"] + mot17_counts["alerts"],
        "motors": {"virat": virat_counts, "mot17": mot17_counts},
    }