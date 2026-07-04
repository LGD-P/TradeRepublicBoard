"""Golden-fixture contract (Sprint P0).

Every CSV in fixtures/cases/ must produce exactly the model frozen in
fixtures/expected/. This locks the Python core AND is the contract the future
TypeScript core must reproduce byte-for-byte.

Run with: python -m pytest
"""
import glob
import json
import os

import pytest

import tr_board as trb

ROOT = os.path.dirname(os.path.dirname(__file__))
CASES = sorted(glob.glob(os.path.join(ROOT, "fixtures", "cases", "*.csv")))


def _expected_path(case):
    name = os.path.splitext(os.path.basename(case))[0]
    return os.path.join(ROOT, "fixtures", "expected", name + ".json")


@pytest.mark.parametrize("case", CASES, ids=[os.path.basename(c) for c in CASES])
def test_model_matches_expected(case):
    trb.select_language("en")                       # model is language-neutral anyway
    rows = trb.validate_export(case)
    model = trb.compute_model(rows)
    with open(_expected_path(case), encoding="utf-8") as f:
        expected = json.load(f)
    assert model == expected


def test_fixtures_exist():
    assert CASES, "no fixture cases found"
    for case in CASES:
        assert os.path.exists(_expected_path(case)), "missing expected for " + case
