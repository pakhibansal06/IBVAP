import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.models import Notification


class NotificationService:
    """Real-time Notification & Simulation Dispatcher (IN_APP / EMAIL / SMS)."""

    def dispatch_alert_notifications(self, db: Session, alert_data: Dict[str, Any]) -> List[Notification]:
        notifications = []
        cam_code = alert_data.get("camera_code", "CAM-01")
        title = alert_data.get("title", "High Risk Intrusion")
        risk_score = alert_data.get("risk_score", 85)
        tracking_id = alert_data.get("tracking_id", "P101")

        n_app = Notification(
            event_id=alert_data.get("event_id"),
            channel="IN_APP",
            recipient="SECURITY_OPERATORS_GROUP",
            title=f"CRITICAL: {title}",
            message=f"Camera {cam_code} detected {tracking_id} with Risk Score {risk_score}/100.",
            status="SENT",
        )
        db.add(n_app)
        notifications.append(n_app)

        n_email = Notification(
            event_id=alert_data.get("event_id"),
            channel="EMAIL",
            recipient="command-hq@border-defense.gov.in",
            title=f"[CRITICAL ALERT] Perimeter Intrusion at {cam_code}",
            message=(
                f"Automated Alert System Dispatch:\nLocation: {cam_code}\nTarget: {tracking_id}\n"
                f"Risk Rating: {risk_score}/100\nReasons:\n"
                + "\n".join(alert_data.get("reasons", []))
            ),
            status="SIMULATED",
        )
        db.add(n_email)
        notifications.append(n_email)

        n_sms = Notification(
            event_id=alert_data.get("event_id"),
            channel="SMS",
            recipient="+91-98765-01920 (Duty Officer)",
            title="CRITICAL BORDER ALERT",
            message=f"ALERT: {cam_code} Intrusion detected! Target {tracking_id}, Risk {risk_score}. Immediate verification required.",
            status="SIMULATED",
        )
        db.add(n_sms)
        notifications.append(n_sms)

        db.commit()
        for n in notifications:
            db.refresh(n)
        return notifications


notification_service = NotificationService()