import os
from datetime import date

import pytest


pytest.importorskip("fastapi")
pytest.importorskip("motor")


# Ensure required environment variables exist before importing the backend module.
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "drivinnchill_test")

from backend.server import (  # noqa: E402
    ContentScheduleCreate,
    TimeSlot,
    normalize_time_slot_value,
)


def test_normalize_time_slot_accepts_enum_values():
    assert normalize_time_slot_value(TimeSlot.FIRST_SHOW) is TimeSlot.FIRST_SHOW


def test_normalize_time_slot_converts_legacy_values():
    assert normalize_time_slot_value("19h00") is TimeSlot.FIRST_SHOW
    assert normalize_time_slot_value("23h30") is TimeSlot.THIRD_SHOW


def test_content_schedule_create_accepts_legacy_time_slot():
    schedule = ContentScheduleCreate(
        content_id="movie-123",
        content_type="movie",
        date=date(2025, 10, 29),
        time_slot="19h00",
        capacity=21,
    )
    assert schedule.time_slot is TimeSlot.FIRST_SHOW
