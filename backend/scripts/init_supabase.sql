-- ============================================================================
-- IBVAP: Supabase-ready DDL
-- Paste into: Supabase SQL Editor  OR  run as psql script
-- ============================================================================
-- 1. tables        2. RLS policies      3. indexes      4. realtime
-- ============================================================================

-- --------------- 1. Tables -----------------------------------------------

CREATE TABLE IF NOT EXISTS users (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username      TEXT    UNIQUE NOT NULL,
    email         TEXT    UNIQUE NOT NULL,
    hashed_password TEXT  NOT NULL,
    role          TEXT    DEFAULT 'OPERATOR',
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cameras (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code          TEXT    UNIQUE NOT NULL,
    name          TEXT    NOT NULL,
    location_name TEXT    NOT NULL,
    latitude      DOUBLE PRECISION NOT NULL,
    longitude     DOUBLE PRECISION NOT NULL,
    status        TEXT    DEFAULT 'ONLINE',
    stream_url    TEXT,
    fps           INT     DEFAULT 30,
    resolution    TEXT    DEFAULT '1920x1080',
    restricted_zone JSONB,
    virtual_fence   JSONB,
    source        TEXT    DEFAULT 'SEEDED',
    source_id     TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS detections (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    camera_id     BIGINT  REFERENCES cameras(id) ON DELETE CASCADE,
    tracking_id   TEXT    NOT NULL,
    object_class  TEXT    NOT NULL,
    confidence    DOUBLE PRECISION NOT NULL,
    bbox          JSONB   NOT NULL,
    frame         INT     DEFAULT 0,
    source        TEXT    DEFAULT 'SEEDED',
    timestamp     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tracked_objects (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tracking_id         TEXT    UNIQUE NOT NULL,
    object_class        TEXT    NOT NULL,
    first_seen          TIMESTAMPTZ DEFAULT NOW(),
    last_seen           TIMESTAMPTZ DEFAULT NOW(),
    camera_history      JSONB   DEFAULT '[]',
    current_camera_code TEXT,
    risk_level          TEXT    DEFAULT 'LOW',
    status              TEXT    DEFAULT 'ACTIVE',
    source              TEXT    DEFAULT 'SEEDED'
);

CREATE TABLE IF NOT EXISTS vehicles (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tracking_id   TEXT    NOT NULL,
    make_model    TEXT,
    color         TEXT,
    plate_number  TEXT,
    confidence    DOUBLE PRECISION DEFAULT 0.9,
    detected_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plates (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    plate_number    TEXT    NOT NULL,
    camera_code     TEXT    NOT NULL,
    confidence      DOUBLE PRECISION NOT NULL,
    is_wanted       BOOLEAN DEFAULT FALSE,
    vehicle_type    TEXT    DEFAULT 'SUV / Truck',
    crop_image_url  TEXT,
    timestamp       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    camera_id       BIGINT REFERENCES cameras(id) ON DELETE CASCADE,
    camera_code     TEXT    NOT NULL,
    title           TEXT    NOT NULL,
    event_type      TEXT    NOT NULL,
    tracking_id     TEXT,
    object_type     TEXT    DEFAULT 'person',
    risk_score      INT     DEFAULT 0,
    risk_level      TEXT    DEFAULT 'LOW',
    timestamp       TIMESTAMPTZ DEFAULT NOW(),
    details         JSONB,
    source          TEXT    DEFAULT 'SEEDED',
    source_event_id TEXT
);

CREATE TABLE IF NOT EXISTS risk_scores (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id    BIGINT REFERENCES events(id) ON DELETE CASCADE,
    total_score INT     NOT NULL,
    risk_level  TEXT    NOT NULL,
    reasons     JSONB   NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id            BIGINT REFERENCES events(id) ON DELETE CASCADE,
    camera_id           BIGINT REFERENCES cameras(id) ON DELETE CASCADE,
    camera_code         TEXT    NOT NULL,
    tracking_id         TEXT,
    title               TEXT    NOT NULL,
    risk_score          INT     NOT NULL,
    risk_level          TEXT    NOT NULL,
    status              TEXT    DEFAULT 'NEW',
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    assigned_operator   TEXT
);

CREATE TABLE IF NOT EXISTS movement_history (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tracking_id   TEXT    NOT NULL,
    camera_code   TEXT    NOT NULL,
    latitude      DOUBLE PRECISION NOT NULL,
    longitude     DOUBLE PRECISION NOT NULL,
    timestamp     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id    BIGINT,
    channel     TEXT    NOT NULL,
    recipient   TEXT    NOT NULL,
    title       TEXT    NOT NULL,
    message     TEXT    NOT NULL,
    status      TEXT    DEFAULT 'SENT',
    timestamp   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incident_actions (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    alert_id      BIGINT REFERENCES alerts(id) ON DELETE CASCADE,
    action_type   TEXT    NOT NULL,
    performed_by  TEXT    NOT NULL,
    notes         TEXT,
    timestamp     TIMESTAMPTZ DEFAULT NOW()
);

-- --------------- 2. Row-Level Security ------------------------------------
-- Enable RLS on all tables; use service_role for backend access (bypasses RLS).
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE cameras            ENABLE ROW LEVEL SECURITY;
ALTER TABLE detections         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_objects    ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE plates             ENABLE ROW LEVEL SECURITY;
ALTER TABLE events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_scores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE movement_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_actions   ENABLE ROW LEVEL SECURITY;

-- Public read policies (the backend always uses service_role to bypass)
CREATE POLICY "Public read cameras"     ON cameras   FOR SELECT USING (true);
CREATE POLICY "Public read events"      ON events    FOR SELECT USING (true);
CREATE POLICY "Public read alerts"      ON alerts    FOR SELECT USING (true);
CREATE POLICY "Public read detections"  ON detections FOR SELECT USING (true);
CREATE POLICY "Public read tracked"     ON tracked_objects FOR SELECT USING (true);
CREATE POLICY "Public read users"       ON users      FOR SELECT USING (true);
CREATE POLICY "Public read vehicles"    ON vehicles   FOR SELECT USING (true);
CREATE POLICY "Public read plates"      ON plates     FOR SELECT USING (true);
CREATE POLICY "Public read incidents"   ON incident_actions FOR SELECT USING (true);
CREATE POLICY "Public read movement"    ON movement_history FOR SELECT USING (true);
CREATE POLICY "Public read risk_scores" ON risk_scores FOR SELECT USING (true);
CREATE POLICY "Public read notifications" ON notifications FOR SELECT USING (true);

-- --------------- 3. Indexes ----------------------------------------------
CREATE INDEX IF NOT EXISTS idx_detections_camera      ON detections(camera_id);
CREATE INDEX IF NOT EXISTS idx_detections_tracking    ON detections(tracking_id);
CREATE INDEX IF NOT EXISTS idx_events_camera          ON events(camera_id);
CREATE INDEX IF NOT EXISTS idx_events_type            ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_risk            ON events(risk_level);
CREATE INDEX IF NOT EXISTS idx_alerts_status          ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_risk            ON alerts(risk_level);
CREATE INDEX IF NOT EXISTS idx_tracked_status         ON tracked_objects(status);
CREATE INDEX IF NOT EXISTS idx_movement_track         ON movement_history(tracking_id);
CREATE INDEX IF NOT EXISTS idx_plates_wanted          ON plates(is_wanted);

-- --------------- 4. Supabase Realtime (optional) -------------------------
-- Enables database webhook / Realtime for alert insert/update
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;