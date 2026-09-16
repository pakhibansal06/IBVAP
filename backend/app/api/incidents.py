from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import IncidentAction, Alert
from app.schemas.schemas import IncidentActionCreate, IncidentActionOut

router = APIRouter(prefix="/incidents", tags=["Incidents & Actions"])


@router.post("/{alert_id}/actions", response_model=IncidentActionOut, status_code=201)
def record_incident_action(
    alert_id: int,
    payload: IncidentActionCreate,
    operator: str = "operator1",
    db: Session = Depends(get_db),
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    action = IncidentAction(
        alert_id=alert_id,
        action_type=payload.action_type,
        performed_by=operator,
        notes=payload.notes or f"Executed action {payload.action_type} for alert #{alert_id}",
    )

    # Update alert status based on action
    if payload.action_type == "DISPATCH_PATROL":
        alert.status = "ACTION_REQUIRED"
    elif payload.action_type == "MONITOR_CAMERA":
        alert.status = "UNDER_REVIEW"
    elif payload.action_type == "ESCALATE":
        alert.status = "ACTION_REQUIRED"
    elif payload.action_type == "MARK_AREA":
        alert.status = "VERIFIED"

    db.add(action)
    db.commit()
    db.refresh(action)
    db.refresh(alert)
    return action


@router.get("/{alert_id}/actions", response_model=List[IncidentActionOut])
def get_incident_actions(alert_id: int, db: Session = Depends(get_db)):
    actions = (
        db.query(IncidentAction)
        .filter(IncidentAction.alert_id == alert_id)
        .order_by(IncidentAction.timestamp.desc())
        .all()
    )
    return actions