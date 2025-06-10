from datetime import timedelta
from typing import List

from mhq.store.models.code.enums import PullRequestEventType
from mhq.service.code.sync.models import PRPerformance
from mhq.store.models.code import (
    PullRequest,
    PullRequestEvent,
    PullRequestCommit,
    PullRequestEventState,
    PullRequestState,
)
from mhq.utils.time import Interval
from mhq.utils.string import is_bot_name


class CodeETLAnalyticsService:
    def create_pr_metrics(
        self,
        pr: PullRequest,
        pr_events: List[PullRequestEvent],
        pr_commits: List[PullRequestCommit],
    ) -> PullRequest:
        if pr.state == PullRequestState.OPEN:
            return pr

        non_bot_pr_events = self.filter_non_bot_events(pr_events)
        pr_performance = self.get_pr_performance(pr, non_bot_pr_events)

        pr.first_response_time = (
            pr_performance.first_review_time
            if pr_performance.first_review_time != -1
            else None
        )
        pr.rework_time = (
            pr_performance.rework_time if pr_performance.rework_time != -1 else None
        )
        pr.merge_time = (
            pr_performance.merge_time if pr_performance.merge_time != -1 else None
        )
        pr.cycle_time = (
            pr_performance.cycle_time if pr_performance.cycle_time != -1 else None
        )
        pr.reviewers = list(
            {
                e.actor_username
                for e in non_bot_pr_events
                if e.actor_username != pr.author
            }
        )

        if pr_commits:
            pr.rework_cycles = self.get_rework_cycles(pr, non_bot_pr_events, pr_commits)
            pr_commits.sort(key=lambda x: x.created_at)
            first_commit_to_open = pr.created_at - pr_commits[0].created_at
            if isinstance(first_commit_to_open, timedelta):
                pr.first_commit_to_open = first_commit_to_open.total_seconds()

        return pr

    @staticmethod
    def get_pr_performance(pr: PullRequest, pr_events: [PullRequestEvent]):

        review_events = [
            event
            for event in pr_events
            if event.type == PullRequestEventType.REVIEW.value
        ]
        review_events.sort(key=lambda x: x.created_at)
        first_review = review_events[0] if review_events else None

        ready_for_review_events = [
            event
            for event in pr_events
            if event.type == PullRequestEventType.READY_FOR_REVIEW.value
        ]
        ready_for_review_events.sort(key=lambda x: x.created_at)
        first_ready_for_review = (
            ready_for_review_events[0] if ready_for_review_events else None
        )

        approved_reviews = list(
            filter(
                lambda x: x.data.get("state") == PullRequestEventState.APPROVED.value,
                review_events,
            )
        )
        blocking_reviews = list(
            filter(
                lambda x: x.data.get("state") != PullRequestEventState.APPROVED.value,
                review_events,
            )
        )

        if not approved_reviews:
            rework_time = -1
        else:
            if first_review.data.get("state") == PullRequestEventState.APPROVED.value:
                rework_time = 0
            else:
                rework_time = (
                    approved_reviews[0].created_at - first_review.created_at
                ).total_seconds()

        if pr.state != PullRequestState.MERGED or not approved_reviews:
            merge_time = -1
        else:
            merge_time = (
                pr.state_changed_at - approved_reviews[0].created_at
            ).total_seconds()
            # Prevent garbage state when PR is approved post merging
            merge_time = -1 if merge_time < 0 else merge_time

        pull_request_ready_for_review_time = (
            first_ready_for_review.created_at
            if first_ready_for_review
            else pr.created_at
        )

        cycle_time = pr.state_changed_at - pull_request_ready_for_review_time
        if isinstance(cycle_time, timedelta):
            cycle_time = cycle_time.total_seconds()

        return PRPerformance(
            first_review_time=(
                (first_review.created_at - pull_request_ready_for_review_time).total_seconds()
                if first_review
                else -1
            ),
            rework_time=rework_time,
            merge_time=merge_time,
            cycle_time=cycle_time if pr.state == PullRequestState.MERGED else -1,
            blocking_reviews=len(blocking_reviews),
            approving_reviews=len(pr_events) - len(blocking_reviews),
            requested_reviews=len(pr.requested_reviews),
        )

    @staticmethod
    def get_rework_cycles(
        pr: PullRequest,
        pr_events: [PullRequestEvent],
        pr_commits: [PullRequestCommit],
    ) -> int:
        review_events = [
            review_event
            for review_event in pr_events
            if review_event.type == PullRequestEventType.REVIEW.value
        ]

        if not review_events:
            return 0

        if not pr_commits:
            return 0
        review_events.sort(key=lambda x: x.created_at)
        pr_commits.sort(key=lambda x: x.created_at)

        first_blocking_review = None
        last_relevant_approval_review = None
        pr_reviewers = dict.fromkeys(pr.reviewers, True)

        for review_event in review_events:
            if (
                review_event.data.get("state") != PullRequestEventState.APPROVED.value
                and pr_reviewers.get(review_event.actor_username)
                and not first_blocking_review
            ):
                first_blocking_review = review_event

            if review_event.data.get("state") == PullRequestEventState.APPROVED.value:
                last_relevant_approval_review = review_event
                break

        if not first_blocking_review:
            return 0

        if not last_relevant_approval_review:
            return 0

        interval = Interval(
            first_blocking_review.created_at - timedelta(seconds=1),
            last_relevant_approval_review.created_at,
        )
        pr_commits = list(
            filter(
                lambda x: x.created_at in interval,
                pr_commits,
            )
        )
        pr_reviewers = dict.fromkeys(pr.reviewers, True)
        blocking_reviews = list(
            filter(
                lambda x: x.data.get("state") != PullRequestEventState.APPROVED.value
                and x.actor_username != pr.author
                and pr_reviewers.get(x.actor_username)
                and x.created_at in interval,
                review_events,
            )
        )
        all_events = sorted(pr_commits + blocking_reviews, key=lambda x: x.created_at)
        rework_cycles = 0
        for curr, next_event in zip(all_events[:-1], all_events[1:]):
            if isinstance(curr, type(next_event)):
                continue
            if isinstance(next_event, PullRequestCommit):
                rework_cycles += 1

        return rework_cycles

    def filter_non_bot_events(
        self, pr_events: List[PullRequestEvent]
    ) -> List[PullRequestEvent]:
        """Filter out events created by bot users using regex patterns."""
        return [
            event
            for event in pr_events
            if event.actor_username is not None
            and (not is_bot_name(event.actor_username))
        ]
