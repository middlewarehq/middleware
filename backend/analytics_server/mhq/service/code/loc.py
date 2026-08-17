from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List

from mhq.store.models.code import PRFilter, PullRequest
from mhq.store.models.code.repository import TeamRepos
from mhq.store.repos.code import CodeRepoService
from mhq.utils.time import (
    Interval,
    fill_missing_week_buckets,
    generate_expanded_buckets,
)


@dataclass
class LOCMetrics:
    additions: int = 0
    deletions: int = 0
    # CLUSTOX: gross lines per merged PR, not net. A 2,000-line refactor that
    # nets to zero is still 2,000 lines to review, and PR size is benchmarked
    # precisely because it predicts review latency.
    avg_pr_size: int = 0
    # CLUSTOX: gross lines per CALENDAR day across the selected range. The
    # headline it replaces was a period total, which is not comparable between
    # two ranges of different lengths -- a month always looks four times
    # "better" than a week. A rate is.
    #
    # Calendar days, not working days: the range the user picked is calendar
    # days, and a working-day divisor would silently disagree with the dates on
    # screen. It does mean a team that works five days a week reads ~29% lower
    # than its working-day rate; that is a consistent scaling, not a bias
    # between teams.
    avg_daily: int = 0


def aggregate_loc(prs: List[PullRequest], days: int = 0) -> LOCMetrics:
    """`days` is the calendar span the PRs were drawn from, used only for
    `avg_daily`. Zero (the default) leaves `avg_daily` at 0 rather than
    guessing a divisor -- a caller that has no interval has no rate."""
    if not prs:
        # CLUSTOX: zero, never None -- the card would otherwise need a third
        # empty state on top of "no data" and "no target".
        return LOCMetrics()

    additions = sum(pr.additions for pr in prs)
    deletions = sum(pr.deletions for pr in prs)
    total = additions + deletions
    return LOCMetrics(
        additions=additions,
        deletions=deletions,
        avg_pr_size=round(total / len(prs)),
        # `days > 0` guards the divisor. A range shorter than a day rounds up
        # to 1 rather than dividing by zero -- see interval_days().
        avg_daily=round(total / days) if days > 0 else 0,
    )


def interval_days(interval: Interval) -> int:
    """Calendar days in an interval, never less than 1.

    CLUSTOX: a same-day range has a duration of 0 and would divide by zero.
    Treating it as one day is also the honest reading -- a single day's work
    over a single day is that day's rate.
    """
    return max(1, round(interval.duration.total_seconds() / 86400))


class LOCService:
    def __init__(self, code_repo_service: CodeRepoService):
        self._code_repo_service = code_repo_service

    def get_team_loc_metrics(
        self,
        team_id: str,
        interval: Interval,
        pr_filter: PRFilter = None,
    ) -> LOCMetrics:
        return aggregate_loc(
            self._get_team_merged_prs(team_id, interval, pr_filter),
            days=interval_days(interval),
        )

    def get_team_loc_trends(
        self,
        team_id: str,
        interval: Interval,
        pr_filter: PRFilter = None,
    ) -> Dict[datetime, LOCMetrics]:

        prs: List[PullRequest] = self._get_team_merged_prs(team_id, interval, pr_filter)

        weekly_prs_map: Dict[datetime, List[PullRequest]] = generate_expanded_buckets(
            prs, interval, "state_changed_at", "weekly"
        )

        weekly_loc_metrics_map: Dict[datetime, LOCMetrics] = {
            # CLUSTOX: 7, not the whole range. Dividing each weekly bucket by
            # the full interval would make every bar shrink as the user widens
            # the date picker, while the same weeks' work stayed identical.
            week: aggregate_loc(week_prs, days=7)
            for week, week_prs in weekly_prs_map.items()
        }

        # CLUSTOX: a week with no merges has to come back as a zero bucket, not
        # be missing -- the trend line is plotted per week and a hole in the map
        # would shift every later point left.
        return fill_missing_week_buckets(weekly_loc_metrics_map, interval, LOCMetrics)

    def _get_team_merged_prs(
        self,
        team_id: str,
        interval: Interval,
        pr_filter: PRFilter = None,
    ) -> List[PullRequest]:

        team_repos: List[TeamRepos] = (
            self._code_repo_service.get_active_team_repos_by_team_id(team_id)
        )

        repo_ids = [str(team_repo.org_repo_id) for team_repo in team_repos]
        if not repo_ids:
            return []

        # CLUSTOX: go through the shared filtered query rather than a LOC-specific
        # one. It is what makes the contributor filter, branch mode and the
        # excluded-PRs setting apply here for free, and it already restricts to
        # MERGED PRs -- an abandoned 5,000-line PR is not delivered work.
        return self._code_repo_service.get_prs_merged_in_interval(
            repo_ids, interval, pr_filter
        )


def get_loc_service() -> LOCService:
    return LOCService(CodeRepoService())
