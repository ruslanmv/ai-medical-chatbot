from math import isclose
from pathlib import Path
import importlib.util


def _load_geo():
    path = Path(__file__).resolve().parents[1] / "08-shared" / "geo.py"
    spec = importlib.util.spec_from_file_location("geo", path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


def test_haversine_zero_distance():
    geo = _load_geo()
    assert isclose(geo.haversine_m(40.0, -70.0, 40.0, -70.0), 0.0, abs_tol=0.01)
