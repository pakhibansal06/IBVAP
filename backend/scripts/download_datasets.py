#!/usr/bin/env python
"""Bulk-download the real dataset sources used by IBVAP.

Two sources:
  1. VIRAT Ground Dataset annotations (Kitware Girder) - ~40 MB zip
  2. MOTChallenge MOT17 dataset (labels-only zip, ~140 MB)

Usage (from the backend directory):
    python scripts/download_datasets.py                 # both sources
    python scripts/download_datasets.py --virat-only
    python scripts/download_datasets.py --mot17-only
    python scripts/download_datasets.py --force         # re-download even if cached

Outputs:
    data_cache/virat/annotations-and-docs.zip + annotations/*.txt   (VIRAT)
    data_cache/mot17/MOT17Labels.zip                                (MOT17)

NOTE: The *full* MOT17.zip (images, 5.86 GB) is not fetched by default because
the labels zip already contains everything this platform consumes (gt.txt,
det.txt, seqinfo.ini). If you want real annotated video frames, download
MOT17.zip manually from https://motchallenge.net/data/MOT17.zip and extract it
into data_cache/mot17/ (seq folders like MOT17-02-SDP/).
"""
from __future__ import annotations

import argparse
from pathlib import Path

from app.core.config import settings


def fetch_url(client: object, url: str, dest: Path, desc: str, force: bool, min_mtime_days: float = 7.0) -> bool:
    import time

    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and not force:
        age = (time.time() - dest.stat().st_mtime) / 86400.0
        if age < min_mtime_days:
            print(f"[download] {desc} already cached: {dest} (~{age:.0f}d old)")
            return False
    print(f"[download] Fetching {desc} -> {dest}")
    with client.stream("GET", url) as resp:
        resp.raise_for_status()
        total = int(resp.headers.get("content-length", 0))
        written = 0
        tmp = dest.with_suffix(dest.suffix + ".part")
        with open(tmp, "wb") as fh:
            for chunk in resp.iter_bytes(chunk_size=1 << 20):
                fh.write(chunk)
                written += len(chunk)
                if total:
                    pct = written * 100 // total
                    print(f"\r  {written/1e6:.1f}/{total/1e6:.0f} MB ({pct}%)", end="", flush=True)
        print()
        tmp.rename(dest)
    return True


def get_httpx_client():
    import httpx

    return httpx.Client(timeout=300, follow_redirects=True)


def download_virat(cache_root: Path, force: bool) -> None:
    from app.data.virat import ViratClient

    ann_dir = ViratClient.download_annotations(cache_root, force=force)
    n = len(list(ann_dir.glob("VIRAT_S_*.txt")))
    print(f"[virat] {n} VIRAT annotation files ready in {ann_dir}")


def download_mot17(cache_root: Path, force: bool) -> None:
    import httpx

    from app.data.mot17 import MOT17Client

    mot_dir = cache_root / "mot17"
    mot_dir.mkdir(parents=True, exist_ok=True)
    zip_path = mot_dir / "MOT17Labels.zip"

    fetched = fetch_url(
        get_httpx_client(),
        MOT17Client.MOT17_LABELS_URL,
        zip_path,
        "MOT17 labels zip",
        force,
    )
    if fetched:
        import io
        import zipfile

        print("[mot17] Verifying zip integrity...")
        with zipfile.ZipFile(io.BytesIO(zip_path.read_bytes())) as zf:
            entries = [e for e in zf.infolist() if e.filename.endswith("gt/gt.txt")]
            print(f"[mot17] OK - {len(entries)} ground-truth files inside")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--virat-only", action="store_true")
    parser.add_argument("--mot17-only", action="store_true")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    cache_root = Path(settings.DATA_CACHE_DIR)
    cache_root.mkdir(parents=True, exist_ok=True)

    if args.virat_only:
        download_virat(cache_root, args.force)
    elif args.mot17_only:
        download_mot17(cache_root, args.force)
    else:
        download_virat(cache_root, args.force)
        download_mot17(cache_root, args.force)

    print("[download] Done.")


if __name__ == "__main__":
    main()