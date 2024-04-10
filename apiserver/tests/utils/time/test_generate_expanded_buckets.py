from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, List, Any

import pytest
import pytz

from dora.utils.time import (
    Interval,
    generate_expanded_buckets,
    get_given_weeks_monday,
    time_now,
)


@dataclass
class AnyObject:
    state_changed_at: datetime


def test_incorrect_interval_raises_exception():
    object_list = []
    from_time = time_now()
    to_time = from_time - timedelta(seconds=1)

    attribute = "state_changed_at"
    with pytest.raises(AssertionError) as e:
        buckets = generate_expanded_buckets(
            object_list, Interval(from_time, to_time), attribute
        )
    assert (
        str(e.value)
        == f"from_time: {from_time.isoformat()} is greater than to_time: {to_time.isoformat()}"
    )


def test_missing_attribute_raise_exception():
    object_list = [AnyObject(time_now())]
    from_time = time_now()
    to_time = from_time + timedelta(seconds=1)
    attribute = "updated_at"
    with pytest.raises(AttributeError) as e:
        buckets = generate_expanded_buckets(
            object_list, Interval(from_time, to_time), attribute
        )


def test_incorrect_attribute_type_raise_exception():
    object_list = [AnyObject("hello")]
    from_time = time_now()
    to_time = from_time + timedelta(seconds=1)
    attribute = "state_changed_at"
    with pytest.raises(Exception) as e:
        buckets = generate_expanded_buckets(
            object_list, Interval(from_time, to_time), attribute
        )
        assert (
            str(e.value)
            == f"Type of datetime_attribute:{type(getattr(object_list[0], attribute))} is not datetime"
        )


def test_empty_data_generates_correct_buckets():
    object_list = []
    from_time = time_now() - timedelta(days=10)
    to_time = from_time + timedelta(seconds=1)
    attribute = "state_changed_at"

    ans_buckets = defaultdict(list)

    curr_date = get_given_weeks_monday(from_time)

    while curr_date < to_time:
        ans_buckets[curr_date] = []
        curr_date = curr_date + timedelta(days=7)

    assert ans_buckets == generate_expanded_buckets(
        object_list, Interval(from_time, to_time), attribute
    )


def test_data_generates_empty_middle_buckets():
    first_week_2023 = datetime(2023, 1, 2, 0, 0, 0, tzinfo=pytz.UTC)
    second_week_2023 = datetime(2023, 1, 9, 0, 0, 0, tzinfo=pytz.UTC)
    third_week_2023 = datetime(2023, 1, 16, 0, 0, 0, tzinfo=pytz.UTC)

    from_time = first_week_2023 + timedelta(days=1)
    to_time = third_week_2023 + timedelta(days=5)

    obj1 = AnyObject(first_week_2023 + timedelta(days=2))
    obj2 = AnyObject(first_week_2023 + timedelta(days=3))
    obj3 = AnyObject(first_week_2023 + timedelta(days=4))
    obj4 = AnyObject(third_week_2023 + timedelta(days=2))
    obj5 = AnyObject(third_week_2023 + timedelta(days=3))
    obj6 = AnyObject(third_week_2023 + timedelta(days=4))
    object_list = [obj1, obj2, obj3, obj4, obj5, obj6]

    attribute = "state_changed_at"

    ans_buckets: Dict[datetime, List[Any]] = defaultdict(list)

    ans_buckets[first_week_2023] = [obj1, obj2, obj3]
    ans_buckets[second_week_2023] = []
    ans_buckets[third_week_2023] = [obj4, obj5, obj6]

    curr_date = get_given_weeks_monday(from_time)

    assert ans_buckets == generate_expanded_buckets(
        object_list, Interval(from_time, to_time), attribute
    )


def test_data_within_interval_generates_correctly_filled_buckets():
    first_week_2023 = datetime(2023, 1, 2, 0, 0, 0, tzinfo=pytz.UTC)
    second_week_2023 = datetime(2023, 1, 9, 0, 0, 0, tzinfo=pytz.UTC)
    third_week_2023 = datetime(2023, 1, 16, 0, 0, 0, tzinfo=pytz.UTC)

    from_time = first_week_2023 + timedelta(days=1)
    to_time = third_week_2023 + timedelta(days=5)

    obj1 = AnyObject(first_week_2023 + timedelta(days=2))
    obj2 = AnyObject(first_week_2023 + timedelta(days=3))
    obj3 = AnyObject(first_week_2023 + timedelta(days=4))
    obj4 = AnyObject(second_week_2023)
    obj5 = AnyObject(second_week_2023 + timedelta(days=6))
    obj6 = AnyObject(third_week_2023 + timedelta(days=4))
    obj7 = AnyObject(third_week_2023 + timedelta(days=2))
    obj8 = AnyObject(third_week_2023 + timedelta(days=3))
    obj9 = AnyObject(third_week_2023 + timedelta(days=4))
    object_list = [obj1, obj2, obj3, obj4, obj5, obj6, obj7, obj8, obj9]

    attribute = "state_changed_at"

    ans_buckets = defaultdict(list)

    ans_buckets[first_week_2023] = [obj1, obj2, obj3]
    ans_buckets[second_week_2023] = [obj4, obj5]
    ans_buckets[third_week_2023] = [obj6, obj7, obj8, obj9]

    assert ans_buckets == generate_expanded_buckets(
        object_list, Interval(from_time, to_time), attribute
    )


def test_data_outside_interval_generates_correctly_filled_buckets():
    last_week_2022 = datetime(2022, 12, 26, 0, 0, 0, tzinfo=pytz.UTC)
    first_week_2023 = datetime(2023, 1, 2, 0, 0, 0, tzinfo=pytz.UTC)
    second_week_2023 = datetime(2023, 1, 9, 0, 0, 0, tzinfo=pytz.UTC)
    third_week_2023 = datetime(2023, 1, 16, 0, 0, 0, tzinfo=pytz.UTC)
    fourth_week_2023 = datetime(2023, 1, 23, 0, 0, 0, tzinfo=pytz.UTC)

    from_time = first_week_2023 + timedelta(days=1)
    to_time = third_week_2023 + timedelta(days=5)

    obj1 = AnyObject(last_week_2022 + timedelta(days=2))
    obj2 = AnyObject(last_week_2022 + timedelta(days=3))
    obj3 = AnyObject(last_week_2022 + timedelta(days=4))
    obj4 = AnyObject(last_week_2022)
    obj5 = AnyObject(second_week_2023 + timedelta(days=6))
    obj6 = AnyObject(fourth_week_2023 + timedelta(days=4))
    obj7 = AnyObject(fourth_week_2023 + timedelta(days=2))
    obj8 = AnyObject(fourth_week_2023 + timedelta(days=3))
    obj9 = AnyObject(fourth_week_2023 + timedelta(days=4))
    object_list = [obj1, obj2, obj3, obj4, obj5, obj6, obj7, obj8, obj9]

    attribute = "state_changed_at"

    ans_buckets = defaultdict(list)

    ans_buckets[last_week_2022] = [obj1, obj2, obj3, obj4]
    ans_buckets[first_week_2023] = []
    ans_buckets[second_week_2023] = [obj5]
    ans_buckets[third_week_2023] = []
    ans_buckets[fourth_week_2023] = [obj6, obj7, obj8, obj9]

    assert ans_buckets == generate_expanded_buckets(
        object_list, Interval(from_time, to_time), attribute
    )


def test_daily_buckets_with_one_per_day():
    object_list = [
        AnyObject(datetime(2022, 1, 1, tzinfo=pytz.UTC)),
        AnyObject(datetime(2022, 1, 2, tzinfo=pytz.UTC)),
        AnyObject(datetime(2022, 1, 2, tzinfo=pytz.UTC)),
    ]
    from_time = datetime(2022, 1, 1, tzinfo=pytz.UTC)
    to_time = datetime(2022, 1, 3, tzinfo=pytz.UTC)
    attribute = "state_changed_at"
    granularity = "daily"
    ans_buckets = defaultdict(list)
    ans_buckets[datetime.fromisoformat("2022-01-01T00:00:00+00:00")] = [object_list[0]]
    ans_buckets[datetime.fromisoformat("2022-01-02T00:00:00+00:00")] = object_list[1:]
    ans_buckets[datetime.fromisoformat("2022-01-03T00:00:00+00:00")] = []
    assert ans_buckets == generate_expanded_buckets(
        object_list, Interval(from_time, to_time), attribute, granularity
    )


def test_daily_buckets_with_multiple_per_day():
    object_list_2 = [
        AnyObject(datetime(2022, 1, 1, tzinfo=pytz.UTC)),
        AnyObject(datetime(2022, 1, 2, tzinfo=pytz.UTC)),
        AnyObject(datetime(2022, 1, 2, 12, 30, tzinfo=pytz.UTC)),
    ]
    from_time_2 = datetime(2022, 1, 1, tzinfo=pytz.UTC)
    to_time_2 = datetime(2022, 1, 3, tzinfo=pytz.UTC)
    attribute = "state_changed_at"
    granularity = "daily"
    ans_buckets_2 = defaultdict(list)
    ans_buckets_2[datetime.fromisoformat("2022-01-01T00:00:00+00:00")] = [
        object_list_2[0]
    ]
    ans_buckets_2[datetime.fromisoformat("2022-01-02T00:00:00+00:00")] = [
        object_list_2[1],
        object_list_2[2],
    ]
    ans_buckets_2[datetime.fromisoformat("2022-01-03T00:00:00+00:00")] = []
    assert ans_buckets_2 == generate_expanded_buckets(
        object_list_2, Interval(from_time_2, to_time_2), attribute, granularity
    )


def test_daily_buckets_without_objects():
    object_list_3 = []
    from_time_3 = datetime(2022, 1, 1, tzinfo=pytz.UTC)
    to_time_3 = datetime(2022, 1, 3, tzinfo=pytz.UTC)
    attribute = "state_changed_at"
    granularity = "daily"
    ans_buckets_3 = defaultdict(list)
    ans_buckets_3[datetime.fromisoformat("2022-01-01T00:00:00+00:00")] = []
    ans_buckets_3[datetime.fromisoformat("2022-01-02T00:00:00+00:00")] = []
    ans_buckets_3[datetime.fromisoformat("2022-01-03T00:00:00+00:00")] = []
    assert ans_buckets_3 == generate_expanded_buckets(
        object_list_3, Interval(from_time_3, to_time_3), attribute, granularity
    )


def test_monthly_buckets():
    object_list = [
        AnyObject(datetime(2022, 1, 1, tzinfo=pytz.UTC)),
        AnyObject(datetime(2022, 2, 1, tzinfo=pytz.UTC)),
        AnyObject(datetime(2022, 2, 15, tzinfo=pytz.UTC)),
        AnyObject(datetime(2022, 3, 1, tzinfo=pytz.UTC)),
        AnyObject(datetime(2022, 3, 15, tzinfo=pytz.UTC)),
    ]
    from_time = datetime(2022, 1, 1, tzinfo=pytz.UTC)
    to_time = datetime(2022, 3, 15, tzinfo=pytz.UTC)
    attribute = "state_changed_at"
    granularity = "monthly"
    ans_buckets = defaultdict(list)
    ans_buckets[datetime.fromisoformat("2022-01-01T00:00:00+00:00")] = [object_list[0]]
    ans_buckets[datetime.fromisoformat("2022-02-01T00:00:00+00:00")] = object_list[1:3]
    ans_buckets[datetime.fromisoformat("2022-03-01T00:00:00+00:00")] = object_list[3:]
    assert ans_buckets == generate_expanded_buckets(
        object_list, Interval(from_time, to_time), attribute, granularity
    )


def test_data_generates_empty_middle_buckets_for_monthly():
    first_month_2023 = datetime(2023, 1, 2, 0, 0, 0, tzinfo=pytz.UTC)
    second_month_2023 = datetime(2023, 2, 9, 0, 0, 0, tzinfo=pytz.UTC)
    third_month_2023 = datetime(2023, 3, 16, 0, 0, 0, tzinfo=pytz.UTC)

    from_time = first_month_2023 + timedelta(days=1)
    to_time = third_month_2023 + timedelta(days=5)

    obj1 = AnyObject(first_month_2023 + timedelta(days=2))
    obj2 = AnyObject(first_month_2023 + timedelta(days=3))
    obj3 = AnyObject(first_month_2023 + timedelta(days=4))
    obj4 = AnyObject(third_month_2023 + timedelta(days=2))
    obj5 = AnyObject(third_month_2023 + timedelta(days=3))
    obj6 = AnyObject(third_month_2023 + timedelta(days=4))
    object_list = [obj1, obj2, obj3, obj4, obj5, obj6]

    attribute = "state_changed_at"
    granularity = "monthly"

    ans_buckets: Dict[datetime, List[Any]] = defaultdict(list)

    ans_buckets[first_month_2023.replace(day=1)] = [obj1, obj2, obj3]
    ans_buckets[second_month_2023.replace(day=1)] = []
    ans_buckets[third_month_2023.replace(day=1)] = [obj4, obj5, obj6]

    assert ans_buckets == generate_expanded_buckets(
        object_list, Interval(from_time, to_time), attribute, granularity
    )
