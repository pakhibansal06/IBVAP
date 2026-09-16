import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="OPERATOR")  # ADMIN, OPERATOR, ANALYST, VIEWER
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Camera(Base):
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)  # CAM-01, VIRAT-S000001, MOT17-02
    name = Column(String, nullable=False)
    location_name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    status = Column(String, default="ONLINE")  # ONLINE, OFFLINE, ALERT
    stream_url = Column(String, nullable=True)
    fps = Column(Integer, default=30)
    resolution = Column(String, default="1920x1080")

    # Coordinates for restricted zone polygon & virtual fence line
    restricted_zone = Column(JSON, nullable=True)  # List of [lat, lng] points
    virtual_fence = Column(JSON, nullable=True)    # Line [[lat1, lng1], [lat2, lng2]]

    # Dataset provenance
    source = Column(String, default="SEEDED")  # SEEDED, VIRAT, MOT17
    source_id = Column(String, nullable=True)  # VIRAT clip id / MOT17 sequence name

    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    events = relationship("Event", back_populates="camera")
    detections = relationship("Detection", back_populates="camera")
    alerts = relationship("Alert", back_populates="camera")


class Detection(Base):
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=False)
    tracking_id = Column(String, index=True, nullable=False)
    object_class = Column(String, nullable=False)  # person, vehicle, animal, object
    confidence = Column(Float, nullable=False)
    bbox = Column(JSON, nullable=False)  # [x, y, width, height] in percentages (0-100)
    frame = Column(Integer, default=0)             # source frame number
    source = Column(String, default="SEEDED")      # SEEDED, VIRAT, MOT17
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    camera = relationship("Camera", back_populates="detections")


class TrackedObject(Base):
    __tablename__ = "tracked_objects"

    id = Column(Integer, primary_key=True, index=True)
    tracking_id = Column(String, unique=True, index=True, nullable=False)
    object_class = Column(String, nullable=False)
    first_seen = Column(DateTime, default=datetime.datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)
    camera_history = Column(JSON, default=list)  # list of camera codes: ["CAM-01", "CAM-02"]
    current_camera_code = Column(String, nullable=True)
    risk_level = Column(String, default="LOW")
    status = Column(String, default="ACTIVE")  # ACTIVE, LEFT_SCENE, INTERCEPTED
    source = Column(String, default="SEEDED")


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    tracking_id = Column(String, nullable=False)
    make_model = Column(String, nullable=True)
    color = Column(String, nullable=True)
    plate_number = Column(String, index=True, nullable=True)
    confidence = Column(Float, default=0.9)
    detected_at = Column(DateTime, default=datetime.datetime.utcnow)


class Plate(Base):
    __tablename__ = "plates"

    id = Column(Integer, primary_key=True, index=True)
    plate_number = Column(String, index=True, nullable=False)
    camera_code = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    is_wanted = Column(Boolean, default=False)
    vehicle_type = Column(String, default="SUV / Truck")
    crop_image_url = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=False)
    camera_code = Column(String, nullable=False)
    title = Column(String, nullable=False)
    event_type = Column(String, nullable=False)  # RESTRICTED_INTRUSION, VIRTUAL_FENCE, NIGHT_MOVEMENT,
    # LOITERING, SUSPICIOUS_VEHICLE, CROSS_CAMERA, ACTIVITY_DIGGING, ACTIVITY_CARRYING ...
    tracking_id = Column(String, nullable=True)
    object_type = Column(String, default="person")
    risk_score = Column(Integer, default=0)       # 0 - 100
    risk_level = Column(String, default="LOW")     # LOW, MEDIUM, HIGH, CRITICAL
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    details = Column(JSON, nullable=True)          # Audit explanations / "Why" breakdown
    source = Column(String, default="SEEDED")      # SEEDED, VIRAT, MOT17
    source_event_id = Column(String, nullable=True)  # VIRAT eventID / MOT17 track id

    camera = relationship("Camera", back_populates="events")
    alerts = relationship("Alert", back_populates="event")
    risk_breakdown = relationship("RiskScore", back_populates="event", uselist=False)


class RiskScore(Base):
    __tablename__ = "risk_scores"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    total_score = Column(Integer, nullable=False)
    risk_level = Column(String, nullable=False)
    reasons = Column(JSON, nullable=False)  # list of strings: ["Restricted zone +30", "Night movement +15"]

    event = relationship("Event", back_populates="risk_breakdown")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=False)
    camera_code = Column(String, nullable=False)
    tracking_id = Column(String, nullable=True)
    title = Column(String, nullable=False)
    risk_score = Column(Integer, nullable=False)
    risk_level = Column(String, nullable=False)
    status = Column(String, default="NEW")  # NEW, UNDER_REVIEW, VERIFIED, FALSE_POSITIVE, ACTION_REQUIRED, RESOLVED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    assigned_operator = Column(String, nullable=True)

    event = relationship("Event", back_populates="alerts")
    camera = relationship("Camera", back_populates="alerts")
    actions = relationship("IncidentAction", back_populates="alert")


class MovementHistory(Base):
    __tablename__ = "movement_history"

    id = Column(Integer, primary_key=True, index=True)
    tracking_id = Column(String, index=True, nullable=False)
    camera_code = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, nullable=True)
    channel = Column(String, nullable=False)  # IN_APP, EMAIL, SMS
    recipient = Column(String, nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String, default="SIMULATED")  # SENT, SIMULATED, FAILED
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


class IncidentAction(Base):
    __tablename__ = "incident_actions"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"), nullable=False)
    action_type = Column(String, nullable=False)  # DISPATCH_PATROL, MONITOR_CAMERA, ESCALATE, MARK_AREA
    performed_by = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    alert = relationship("Alert", back_populates="actions")


# VIRAT Ground dataset event type -> platform event type mapping
VIRAT_EVENT_TYPES = {
    1: "ACTIVITY_LOADING",
    2: "ACTIVITY_UNLOADING",
    3: "ACTIVITY_TRUNK_OPEN",
    4: "ACTIVITY_TRUNK_CLOSE",
    5: "ACTIVITY_GET_IN_VEHICLE",
    6: "ACTIVITY_GET_OUT_VEHICLE",
    7: "ACTIVITY_GESTURING",
    8: "ACTIVITY_DIGGING",
    9: "ACTIVITY_CARRYING",
    10: "ACTIVITY_RUNNING",
    11: "ENTERING_FACILITY",
    12: "EXITING_FACILITY",
}

VIRAT_EVENT_LABELS = {
    1: "Loading object onto vehicle",
    2: "Unloading object from vehicle",
    3: "Opening vehicle trunk",
    4: "Closing vehicle trunk",
    5: "Getting into vehicle",
    6: "Getting out of vehicle",
    7: "Gesturing",
    8: "Digging activity",
    9: "Carrying an object",
    10: "Running person",
    11: "Entering a facility",
    12: "Exiting a facility",
}