"""Database seeding orchestrator.

Usage:
    python -m app.data.seed                 # seed demo + datasets (VIRAT, MOT17)
    python -m app.data.seed --demo-only     # just demo baseline data
    python -m app.data.seed --virat-clips 5 --mot17-seqs 3 --force

Connects to the configured DATABASE_URL (Supabase PostgreSQL or local SQLite).
"""
from __future__ import annotations

import argparse
from pathlib import Path

from app.core.config import settings
from app.core.database import SessionLocal, init_db
from app.services.demo_engine import demo_engine


def seed_demo(db):
    demo_engine.initialize_demo_db(db)


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed IBVAP backend with real dataset data.")
    parser.add_argument("--demo-only", action="store_true", help="Only seed demo baseline data")
    parser.add_argument("--virat-clips", type=int, default=settings.DATASET_VIRAT_MAX_CLIPS)
    parser.add_argument("--mot17-seqs", type=int, default=settings.DATASET_MOT17_SEQUENCES)
    parser.add_argument("--force", action="store_true", help="Re-fetch dataset files even if cached")
    args = parser.parse_args()

    cache_dir = Path(settings.DATA_CACHE_DIR)
    cache_dir.mkdir(parents=True, exist_ok=True)

    print(f"[seed] Using database: {settings.DATABASE_URL[:60]}...")
    if settings.DATABASE_URL.startswith("sqlite"):
        init_db()

    db = SessionLocal()
    try:
        # 1) Baseline demo (users + cameras + seed alert)
        seed_demo(db)
        print("[seed] Demo baseline seeded")

        if not args.demo_only:
            # 2) VIRAT (Kitware Girder API, cached locally)
            from app.data.virat import ingest_virat

            ingest_virat(db, cache_dir=cache_dir, max_clips=args.virat_clips)

            # 3) MOT17 (MOTChallenge labels) - optional; skipped if not downloaded
            try:
                from app.data.mot17 import ingest_mot17

                ingest_mot17(db, cache_dir=cache_dir, num_sequences=args.mot17_seqs)
            except Exception as exc:  # noqa: BLE001 - MOT17 is best-effort
                print(
                    "[seed] WARNING: MOT17 skipped ({}). "
                    "Run `python scripts/download_datasets.py --mot17-only` first.".format(exc)
                )
    except Exception as exc:
        db.rollback()
        print(f"[seed] ERROR: {exc}")
        raise
    finally:
        db.close()

    print("[seed] Done. Start the API with:  uvicorn app.main:app --host 0.0.0.0 --port 8000")


if __name__ == "__main__":
    main()