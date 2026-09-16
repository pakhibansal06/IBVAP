from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# SQLite needs thread-safe pragma; PostgreSQL (Supabase) does not.
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables. For Supabase use scripts/init_supabase.sql instead."""
    # Import models so they register on Base.metadata
    import app.models.models  # noqa: F401

    Base.metadata.create_all(bind=engine)


def is_supabase() -> bool:
    return settings.SUPABASE_URL.startswith("https://") or "supabase" in settings.DATABASE_URL.lower()


def is_sqlite() -> bool:
    return settings.DATABASE_URL.startswith("sqlite")