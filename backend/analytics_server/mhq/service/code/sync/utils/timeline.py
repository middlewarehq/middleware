from typing import List, TypeVar, Optional, Type

from mhq.exapi.models.timeline import (
    GitHubTimeline,
    GitHubReviewEvent,
    GitHubReadyForReviewEvent,
)
from mhq.store.models.code import PullRequestEvent

T = TypeVar("T")
E = TypeVar("E")


class TimelineEventUtils:
    @staticmethod
    def filter_by_type(events: List[T], event_type: str) -> List[T]:
        """
        Filter events by their type attribute.

        Args:
            events: List of events to filter
            event_type: Type to filter by

        Returns:
            List of events matching the specified type
        """
        return [event for event in events if event.type == event_type]

    @staticmethod
    def filter_by_instance_type(events: List[E], event_class: Type[T]) -> List[T]:
        """
        Filter events by their class type.

        Args:
            events: List of events to filter
            event_class: Class type to filter by

        Returns:
            List of events that are instances of the specified class
        """
        return [event for event in events if isinstance(event, event_class)]

    @staticmethod
    def get_review_events(timeline: List[GitHubTimeline]) -> List[GitHubReviewEvent]:
        """
        Extract review events from the PR timeline.

        Args:
            timeline: List of GitHub timeline events

        Returns:
            List of GitHub review events
        """
        return TimelineEventUtils.filter_by_instance_type(timeline, GitHubReviewEvent)

    @staticmethod
    def get_earliest_ready_for_review_event(
        timeline: List[GitHubTimeline],
    ) -> Optional[GitHubReadyForReviewEvent]:
        """
        Find the earliest ready for review event from the PR timeline.

        Args:
            timeline: List of GitHub timeline events

        Returns:
            The earliest ready for review event, or None if no such events exist
        """
        ready_events = TimelineEventUtils.filter_by_instance_type(
            timeline, GitHubReadyForReviewEvent
        )
        return (
            min(ready_events, key=lambda event: event.created_at)
            if ready_events
            else None
        )

    @staticmethod
    def get_sorted_events_by_type(
        pr_events: List[PullRequestEvent], event_type: str
    ) -> List[PullRequestEvent]:
        """
        Get pull request events filtered by type and sorted by creation time.

        Args:
            pr_events: List of pull request events
            event_type: Type to filter by (can be enum or string value)

        Returns:
            List of filtered events sorted by creation time
        """

        events = TimelineEventUtils.filter_by_type(pr_events, event_type)
        return sorted(events, key=lambda x: x.created_at)
