from datetime import timedelta
from typing import List

from dora.service.code.sync.models import PRPerformance
from dora.store.models.code import (
    PullRequest,
    PullRequestEvent,
    PullRequestCommit,
    PullRequestEventState,
    PullRequestState,
)
from dora.utils.time import Interval


class CodeETLAnalyticsService:
    def create_pr_metrics(
        self,
        pr: PullRequest,
        pr_events: List[PullRequestEvent],
        pr_commits: List[PullRequestCommit],
    ) -> PullRequest:
        pr_performance = self.get_pr_performance(pr, pr_events)

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
            {e.actor_username for e in pr_events if e.actor_username != pr.author}
        )

        if pr_commits:
            pr.rework_cycles = self.get_rework_cycles(pr, pr_events, pr_commits)
            pr_commits.sort(key=lambda x: x.created_at)
            pr.first_commit_to_open = (
                pr.created_at - pr_commits[0].created_at
            ).total_seconds()

        return pr

    def get_pr_performance(self, pr: PullRequest, pr_events: [PullRequestEvent]):
        pr_events.sort(key=lambda x: x.created_at)
        first_review = pr_events[0] if pr_events else None
        approved_reviews = list(
            filter(
                lambda x: x.data["state"] == PullRequestEventState.APPROVED.value,
                pr_events,
            )
        )
        blocking_reviews = list(
            filter(
                lambda x: x.data["state"] != PullRequestEventState.APPROVED.value,
                pr_events,
            )
        )

        if not approved_reviews:
            rework_time = -1
        else:
            if first_review.data["state"] == PullRequestEventState.APPROVED.value:
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

        return PRPerformance(
            first_review_time=(first_review.created_at - pr.created_at).total_seconds()
            if first_review
            else -1,
            rework_time=rework_time,
            merge_time=merge_time,
            cycle_time=(pr.state_changed_at - pr.created_at).total_seconds()
            if pr.state == PullRequestState.MERGED
            else -1,
            blocking_reviews=len(blocking_reviews),
            approving_reviews=len(pr_events) - len(blocking_reviews),
            requested_reviews=len(pr.requested_reviews),
        )

    def get_rework_cycles(
        self,
        pr: PullRequest,
        pr_events: [PullRequestEvent],
        pr_commits: [PullRequestCommit],
    ) -> int:

        if not pr_events:
            return 0

        if not pr_commits:
            return 0

        pr_events.sort(key=lambda x: x.created_at)
        pr_commits.sort(key=lambda x: x.created_at)

        first_blocking_review = None
        last_relevant_approval_review = None
        pr_reviewers = dict.fromkeys(pr.reviewers, True)

        for pr_event in pr_events:
            if (
                pr_event.state != PullRequestEventState.APPROVED.value
                and pr_reviewers.get(pr_event.actor_username)
                and not first_blocking_review
            ):
                first_blocking_review = pr_event

            if pr_event.state == PullRequestEventState.APPROVED.value:
                last_relevant_approval_review = pr_event
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
                lambda x: x.state != PullRequestEventState.APPROVED.value
                and x.actor_username != pr.author
                and pr_reviewers.get(x.actor_username)
                and x.created_at in interval,
                pr_events,
            )
        )
        all_events = sorted(pr_commits + blocking_reviews, key=lambda x: x.created_at)
        rework_cycles = 0
        for curr, next in zip(all_events[:-1], all_events[1:]):
            if type(curr) == type(next):
                continue
            if type(next) == PullRequestCommit:
                rework_cycles += 1

        return rework_cycles
