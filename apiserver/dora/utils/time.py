from datetime import datetime, timedelta

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
