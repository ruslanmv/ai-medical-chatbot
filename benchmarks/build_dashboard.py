#!/usr/bin/env python3
"""Build the HTML dashboard from a results CSV.

Usage:
    python build_dashboard.py                       # out/results.csv → out/dashboard.html
    python build_dashboard.py --csv my.csv --output my.html
    python build_dashboard.py --title "Q1 2026 Medical Benchmark"

Open the resulting HTML directly in a browser, host it as a static
page, or attach it to a deck. The Plotly bundle is loaded from CDN
so the file stays small (~50 KB) and remains interactive.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from medos_bench.dashboard import build_dashboard


HERE = Path(__file__).resolve().parent


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Build the MedOS benchmark HTML dashboard")
    p.add_argument("--csv", type=Path, default=HERE / "out" / "results.csv")
    p.add_argument("--output", type=Path, default=HERE / "out" / "dashboard.html")
    p.add_argument("--title", default="MedOS vs ChatGPT — Medical Benchmark")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    if not args.csv.exists():
        print(f"ERROR: {args.csv} not found — run `python run.py` first", file=sys.stderr)
        sys.exit(1)
    build_dashboard(args.csv, args.output, title=args.title)
    print(f"wrote dashboard → {args.output}")
    print(f"open with: file://{args.output.resolve()}")


if __name__ == "__main__":
    main()
