from datetime import datetime, timezone

from mhq.service.code.loc import LOCMetrics, LOCService, aggregate_loc
from mhq.utils.time import Interval


def _pr(additions, deletions, state="MERGED", state_changed_at=None):
    class FakePR:
        pass

    pr = FakePR()
    pr.additions = additions
    pr.deletions = deletions
    pr.state = state
    pr.state_changed_at = state_changed_at
    return pr


def test_aggregate_sums_additions_and_deletions():
    result = aggregate_loc([_pr(10, 5), _pr(20, 1)])
    assert result.additions == 30
    assert result.deletions == 6


def test_avg_pr_size_is_gross_lines_over_pr_count():
    # (10+5 + 20+1) / 2 == 18
    result = aggregate_loc([_pr(10, 5), _pr(20, 1)])
    assert result.avg_pr_size == 18


def test_avg_pr_size_is_zero_not_a_crash_when_no_prs():
    # A team with no merged PRs in range must not divide by zero, and must not
    # report None -- the card would then need a third empty state.
    result = aggregate_loc([])
    assert result == LOCMetrics(additions=0, deletions=0, avg_pr_size=0)


class FakeTeamRepo:
    def __init__(self, org_repo_id):
        self.org_repo_id = org_repo_id


class FakeCodeRepoService:
    def __init__(self, prs, team_repos=None):
        self._prs = prs
        self._team_repos = (
            team_repos if team_repos is not None else [FakeTeamRepo("repo-1")]
        )
        self.merged_in_interval_calls = []

    def get_active_team_repos_by_team_id(self, team_id):
        return self._team_repos

    def get_prs_merged_in_interval(self, repo_ids, interval, pr_filter=None):
        self.merged_in_interval_calls.append((repo_ids, interval, pr_filter))
        return self._prs


def test_team_loc_metrics_are_fetched_through_the_shared_pr_filter():
    # The contributor filter, branch mode and the excluded-PRs setting all live
    # on PRFilter -- a hand-rolled query would silently drop all three.
    prs = [_pr(10, 5), _pr(20, 1)]
    code_repo_service = FakeCodeRepoService(prs)
    interval = Interval(datetime(2024, 1, 1), datetime(2024, 1, 15))
    pr_filter = object()

    result = LOCService(code_repo_service).get_team_loc_metrics(
        "team-1", interval, pr_filter
    )

    assert result == LOCMetrics(additions=30, deletions=6, avg_pr_size=18)
    assert code_repo_service.merged_in_interval_calls == [
        (["repo-1"], interval, pr_filter)
    ]


def test_team_loc_trends_bucket_prs_into_the_week_they_merged():
    # 2024-01-01 and 2024-01-08 are Mondays.
    prs = [
        _pr(10, 5, state_changed_at=datetime(2024, 1, 3)),
        _pr(20, 1, state_changed_at=datetime(2024, 1, 9)),
    ]
    interval = Interval(datetime(2024, 1, 1), datetime(2024, 1, 14))

    trends = LOCService(FakeCodeRepoService(prs)).get_team_loc_trends(
        "team-1", interval, None
    )

    assert trends[datetime(2024, 1, 1, tzinfo=timezone.utc)] == LOCMetrics(
        additions=10, deletions=5, avg_pr_size=15
    )
    assert trends[datetime(2024, 1, 8, tzinfo=timezone.utc)] == LOCMetrics(
        additions=20, deletions=1, avg_pr_size=21
    )


def test_team_loc_trends_report_zero_for_a_week_with_no_merges():
    # Every week in the window must be present, so the chart has no gaps.
    prs = [_pr(10, 5, state_changed_at=datetime(2024, 1, 3))]
    interval = Interval(datetime(2024, 1, 1), datetime(2024, 1, 14))

    trends = LOCService(FakeCodeRepoService(prs)).get_team_loc_trends(
        "team-1", interval, None
    )

    assert trends[datetime(2024, 1, 8, tzinfo=timezone.utc)] == LOCMetrics()


def test_a_team_with_no_active_repos_reports_zero_rather_than_querying():
    code_repo_service = FakeCodeRepoService([], team_repos=[])
    interval = Interval(datetime(2024, 1, 1), datetime(2024, 1, 15))

    result = LOCService(code_repo_service).get_team_loc_metrics(
        "team-1", interval, None
    )

    assert result == LOCMetrics()
    assert code_repo_service.merged_in_interval_calls == []
