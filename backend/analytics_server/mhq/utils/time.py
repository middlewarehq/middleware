from datetime import datetime, timedelta
from typing import Callable, List, Dict, Any, Optional
from collections import defaultdict

import pytz

ISO_8601_DATE_FORMAT = "%Y-%m-%dT%H:%M:%SZ"


def time_now():
    return datetime.now().astimezone(pytz.UTC)


class Interval:
    def __init__(self, from_time: datetime, to_time: datetime):
        assert (
            to_time >= from_time
        ), f"from_time: {from_time.isoformat()} is greater than to_time: {to_time.isoformat()}"
        self._from_time = from_time
        self._to_time = to_time

    def __contains__(self, dt: datetime):
        return self.from_time < dt < self.to_time

    @property
    def from_time(self):
        return self._from_time

    @property
    def to_time(self):
        return self._to_time

    @property
    def duration(self) -> timedelta:
        return self._to_time - self._from_time

    def overlaps(self, interval):
        if interval.from_time <= self.to_time < interval.to_time:
            return True

        if self.from_time <= interval.from_time < self.to_time:
            return True

        return False

    def merge(self, interval):
        return Interval(
            min(self.from_time, interval.from_time), max(self.to_time, interval.to_time)
        )

    def merge(self, interval: []):
        return Interval(
            min(self.from_time, interval.from_time), max(self.to_time, interval.to_time)
        )

    def __str__(self):
        return f"{self._from_time.isoformat()} -> {self._to_time.isoformat()}"

    def __repr__(self):
        return str(self)

    def __eq__(self, other):
        return self.from_time == other.from_time and self.to_time == other.to_time

    @staticmethod
    def merge_intervals(intervals):
        if not intervals or len(intervals) == 1:
            return intervals

        intervals.sort(key=lambda x: (x.from_time, x.to_time))
        merged_intervals = [intervals[0]]
        for interval in intervals[1:]:
            if merged_intervals[-1].overlaps(interval):
                merged_intervals[-1] = merged_intervals[-1].merge(interval)
            else:
                merged_intervals.append(interval)

        return merged_intervals

    def get_remaining_intervals(self, intervals):
        if not intervals:
            return [self]

        intervals = Interval.merge_intervals(intervals)

        free_intervals = []
        fro, to = self.from_time, self.to_time
        for interval in intervals:
            if interval.from_time > fro:
                free_intervals.append(Interval(fro, interval.from_time))
                fro = interval.to_time

        if fro < to:
            free_intervals.append(Interval(fro, to))

        return free_intervals


def get_start_of_day(date: datetime) -> datetime:
    return datetime(date.year, date.month, date.day, 0, 0, 0, tzinfo=pytz.UTC)


def get_end_of_day(date: datetime) -> datetime:
    return datetime(
        date.year, date.month, date.day, 23, 59, 59, 999999, tzinfo=pytz.UTC
    )


def get_given_weeks_monday(dt: datetime):
    monday = dt - timedelta(days=dt.weekday())

    monday_midnight = datetime(
        monday.year, monday.month, monday.day, 0, 0, 0, tzinfo=pytz.UTC
    )

    return monday_midnight


def get_given_weeks_sunday(dt: datetime):
    sunday = dt + timedelta(days=(6 - dt.weekday()))
    sunday_midnight = datetime(sunday.year, sunday.month, sunday.day, tzinfo=pytz.UTC)
    return get_end_of_day(sunday_midnight)


def get_time_delta_based_on_granularity(date: datetime, granularity: str) -> timedelta:
    """
    Takes a date and a granularity.
    Returns a timedelta based on the granularity.
    Granularity options: 'daily', 'weekly', 'monthly'.
    """
    if granularity == "daily":
        return timedelta(days=1)
    if granularity == "weekly":
        return timedelta(weeks=1)
    if granularity == "monthly":
        some_day_in_next_month = date.replace(day=28) + timedelta(days=4)
        last_day_of_month = some_day_in_next_month - timedelta(
            days=some_day_in_next_month.day
        )
        return last_day_of_month - date + timedelta(days=1)
    raise ValueError("Invalid granularity. Choose 'daily', 'weekly', or 'monthly'.")


def get_expanded_interval_based_on_granularity(
    interval: Interval, granularity: str
) -> Interval:
    """
    Takes an interval and a granularity.
    Returns an expanded interval based on the granularity.
    Granularity options: 'daily', 'weekly', 'monthly'.
    """
    if granularity == "daily":
        return Interval(
            get_start_of_day(interval.from_time), get_end_of_day(interval.to_time)
        )
    if granularity == "weekly":
        return Interval(
            get_given_weeks_monday(interval.from_time),
            get_given_weeks_sunday(interval.to_time),
        )
    if granularity == "monthly":
        some_day_in_next_month = interval.to_time.replace(day=28) + timedelta(days=4)
        return Interval(
            datetime(
                interval.from_time.year, interval.from_time.month, 1, tzinfo=pytz.UTC
            ),
            get_end_of_day(
                some_day_in_next_month - timedelta(days=some_day_in_next_month.day)
            ),
        )
    raise ValueError("Invalid granularity. Choose 'daily', 'weekly', or 'monthly'.")


def generate_expanded_buckets(
    lst: List[Any],
    interval: Interval,
    datetime_attribute: str,
    granularity: str = "weekly",
) -> Dict[datetime, List[Any]]:
    """
    Takes a list of objects, time interval, a datetime_attribute string, and a granularity.
    Buckets the list of objects based on the specified granularity of the datetime_attribute.
    The series is expanded beyond the input interval based on the datetime_attribute.
    Granularity options: 'daily', 'weekly', 'monthly'.
    """
    from_time = interval.from_time
    to_time = interval.to_time

    def generate_empty_buckets(
        from_time: datetime, to_time: datetime, granularity: str
    ) -> Dict[datetime, List[Any]]:
        buckets_map: Dict[datetime, List[Any]] = defaultdict(list)
        expanded_interval = get_expanded_interval_based_on_granularity(
            Interval(from_time, to_time), granularity
        )
        curr_date = expanded_interval.from_time
        while curr_date <= expanded_interval.to_time:
            delta = get_time_delta_based_on_granularity(curr_date, granularity)
            buckets_map[get_start_of_day(curr_date)] = []
            curr_date += delta

        return buckets_map

    for obj in lst:
        if not isinstance(getattr(obj, datetime_attribute), datetime):
            raise ValueError(
                f"Type of datetime_attribute {type(getattr(obj, datetime_attribute))} is not datetime"
            )

    buckets_map: Dict[datetime, List[Any]] = generate_empty_buckets(
        from_time, to_time, granularity
    )

    for obj in lst:
        date_value = getattr(obj, datetime_attribute)
        if granularity == "daily":
            bucket_key = get_start_of_day(date_value)
        elif granularity == "weekly":
            # Adjust the date to the start of the week (Monday)
            bucket_key = get_start_of_day(
                date_value - timedelta(days=date_value.weekday())
            )
        elif granularity == "monthly":
            # Adjust the date to the start of the month
            bucket_key = get_start_of_day(date_value.replace(day=1))
        else:
            raise ValueError(
                "Invalid granularity. Choose 'daily', 'weekly', or 'monthly'."
            )

        buckets_map[bucket_key].append(obj)

    return buckets_map


def sort_dict_by_datetime_keys(input_dict):
    sorted_items = sorted(input_dict.items())
    sorted_dict = dict(sorted_items)
    return sorted_dict


def fill_missing_week_buckets(
    week_start_to_object_map: Dict[datetime, Any],
    interval: Interval,
    callable_class: Optional[Callable] = None,
) -> Dict[datetime, Any]:
    """
    Takes a dict of week_start to object map.
    Add the missing weeks with default value of the class/callable.
    If no callable is passed, the missing weeks are set to None.
    """
    first_monday = get_given_weeks_monday(interval.from_time)
    last_sunday = get_given_weeks_sunday(interval.to_time)

    curr_day = first_monday
    week_start_to_object_map_with_weeks_in_interval = {}

    while curr_day < last_sunday:
        if curr_day not in week_start_to_object_map:
            week_start_to_object_map_with_weeks_in_interval[curr_day] = (
                callable_class() if callable_class else None
            )
        else:
            week_start_to_object_map_with_weeks_in_interval[curr_day] = (
                week_start_to_object_map[curr_day]
            )

        curr_day = curr_day + timedelta(days=7)

    return sort_dict_by_datetime_keys(week_start_to_object_map_with_weeks_in_interval)


def dt_from_iso_time_string(j_str_dt) -> Optional[datetime]:
    if not j_str_dt:
        return None
    dt_without_timezone = datetime.strptime(j_str_dt, "%Y-%m-%dT%H:%M:%S.%f%z")
    return dt_without_timezone.astimezone(pytz.UTC)
