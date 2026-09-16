#!/usr/bin/env python
"""Convenience CLI to seed the database from the VIRAT and MOT17 datasets.

Usage (from the backend directory):
    python scripts/seed_datasets.py                 # demo + VIRAT + MOT17
    python scripts/seed_datasets.py --demo-only     # baseline demo data only
    python scripts/seed_datasets.py --virat-clips 5 --mot17-seqs 4
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.data.seed import main  # noqa: E402

if __name__ == "__main__":
    main()