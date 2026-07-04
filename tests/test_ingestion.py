"""Tests for the hardened CSV ingestion (Sprint 02).

Run with: python -m pytest
"""
import csv
import os

import pytest

import tr_board as trb

SAMPLE = os.path.join(os.path.dirname(__file__), "..", "sample_data",
                      "transactions_sample.csv")


def _write(path, header, rows):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)


def _good_row(name="Fund", isin="IE00B4L5Y983"):
    # one value per REQUIRED column, in order
    return ["2025-01-15", "TRADING", "BUY", "FUND", name, isin, "1", "100", "-100", "0"]


def test_good_sample_passes():
    rows = trb.validate_export(SAMPLE)
    assert rows and "type" in rows[0]


def test_missing_file_rejected(tmp_path):
    with pytest.raises(SystemExit):
        trb.validate_export(str(tmp_path / "nope.csv"))


def test_bad_extension_rejected(tmp_path):
    p = tmp_path / "export.txt"
    _write(p, trb.REQUIRED_COLUMNS, [_good_row()])
    with pytest.raises(SystemExit):
        trb.validate_export(str(p))


def test_missing_columns_rejected(tmp_path):
    p = tmp_path / "x.csv"
    _write(p, ["foo", "bar"], [["1", "2"]])
    with pytest.raises(SystemExit):
        trb.validate_export(str(p))


def test_oversized_rejected(tmp_path, monkeypatch):
    p = tmp_path / "x.csv"
    _write(p, trb.REQUIRED_COLUMNS, [_good_row()])
    monkeypatch.setattr(trb, "MAX_FILE_BYTES", 1)
    with pytest.raises(SystemExit):
        trb.validate_export(str(p))


def test_field_too_long_rejected(tmp_path, monkeypatch):
    p = tmp_path / "x.csv"
    _write(p, trb.REQUIRED_COLUMNS, [_good_row(name="x" * 50)])
    monkeypatch.setattr(trb, "MAX_FIELD_LEN", 10)
    with pytest.raises(SystemExit):
        trb.validate_export(str(p))


def test_extra_columns_tolerated(tmp_path, capsys):
    p = tmp_path / "x.csv"
    _write(p, trb.REQUIRED_COLUMNS + ["extra"], [_good_row() + ["junk"]])
    rows = trb.validate_export(str(p))          # tolerated, not rejected
    assert len(rows) == 1


@pytest.mark.parametrize("evil", ["=HYPERLINK(\"x\")", "+1+1", "-2+cmd", "@SUM(A1)"])
def test_formula_injection_neutralised(evil):
    out = trb.safe_text(evil)
    assert out.startswith("'")                  # forced to text


def test_plain_text_untouched():
    assert trb.safe_text("Apple Inc.") == "Apple Inc."
    assert trb.safe_text("iShares Core MSCI World USD (Acc)").startswith("i")
