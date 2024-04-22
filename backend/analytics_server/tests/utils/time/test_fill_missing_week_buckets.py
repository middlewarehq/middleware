from dataclasses import dataclass
from datetime import datetime

import pytz

from mhq.utils.time import Interval, fill_missing_week_buckets


last_week_2022 = datetime(2022, 12, 26, 0, 0, 0, tzinfo=pytz.UTC)
first_week_2023 = datetime(2023, 1, 2, 0, 0, 0, tzinfo=pytz.UTC)
second_week_2023 = datetime(2023, 1, 9, 0, 0, 0, tzinfo=pytz.UTC)
third_week_2023 = datetime(2023, 1, 16, 0, 0, 0, tzinfo=pytz.UTC)
fourth_week_2023 = datetime(2023, 1, 23, 0, 0, 0, tzinfo=pytz.UTC)


@dataclass
class sample_class:
    score: int = 10
    name: str = "MHQ"


def test_fill_missing_buckets_fills_missing_weeks_in_middle():
    interval = Interval(last_week_2022, fourth_week_2023)
    assert fill_missing_week_buckets(
        {last_week_2022: sample_class(1, ""), fourth_week_2023: sample_class(2, "")},
        interval,
    ) == {
        last_week_2022: sample_class(1, ""),
        first_week_2023: None,
        second_week_2023: None,
        third_week_2023: None,
        fourth_week_2023: sample_class(2, ""),
    }


def test_fill_missing_buckets_fills_missing_weeks_in_past():
    interval = Interval(last_week_2022, fourth_week_2023)
    assert fill_missing_week_buckets(
        {third_week_2023: sample_class(1, ""), fourth_week_2023: sample_class(2, "")},
        interval,
    ) == {
        last_week_2022: None,
        first_week_2023: None,
        second_week_2023: None,
        third_week_2023: sample_class(1, ""),
        fourth_week_2023: sample_class(2, ""),
    }


def test_fill_missing_buckets_fills_missing_weeks_in_future():
    interval = Interval(last_week_2022, fourth_week_2023)
    assert fill_missing_week_buckets(
        {last_week_2022: sample_class(1, ""), first_week_2023: sample_class(2, "")},
        interval,
    ) == {
        last_week_2022: sample_class(1, ""),
        first_week_2023: sample_class(2, ""),
        second_week_2023: None,
        third_week_2023: None,
        fourth_week_2023: None,
    }


def test_fill_missing_buckets_fills_past_and_future_weeks_with_callable():
    interval = Interval(last_week_2022, fourth_week_2023)
    assert fill_missing_week_buckets(
        {first_week_2023: sample_class(2, "")}, interval, sample_class
    ) == {
        last_week_2022: sample_class(),
        first_week_2023: sample_class(2, ""),
        second_week_2023: sample_class(),
        third_week_2023: sample_class(),
        fourth_week_2023: sample_class(),
    }
