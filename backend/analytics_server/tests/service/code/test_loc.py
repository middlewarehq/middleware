import re
from datetime import datetime, timezone
from uuid import uuid4

from mhq.service.code.loc import LOCMetrics, LOCService, aggregate_loc
from mhq.store.models.code import PRFilter, PullRequestState
from mhq.utils.time import Interval
from tests.factories.models.code import get_pull_request


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

    assert result == LOCMetrics(additions=30, deletions=6, avg_pr_size=18, avg_daily=3)
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
        additions=10, deletions=5, avg_pr_size=15, avg_daily=2
    )
    assert trends[datetime(2024, 1, 8, tzinfo=timezone.utc)] == LOCMetrics(
        additions=20, deletions=1, avg_pr_size=21, avg_daily=3
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


# ---------------------------------------------------------------------------
# Filter inheritance.
#
# CLUSTOX: the tests above assert the PRFilter is handed over unmodified. That
# is necessary but not sufficient: it passes just as happily against a
# LOCService that forwards the object and then ignores what comes back, or that
# swaps in an unfiltered fetch. The only thing that catches those is asserting
# the numbers MOVE when a filter is applied, so every case below pins the
# unfiltered total as well as the narrowed one.
#
# The suite has no database, so the real WHERE clause cannot run. The fake
# below mirrors it in Python -- merged-only, inside the interval, plus each
# PRFilter condition -- and narrows using nothing but the filter it is handed.
# Drop the filter anywhere between get_team_loc_metrics and the fetch and the
# narrowed assertions collapse back onto the unfiltered ones.
# ---------------------------------------------------------------------------

REPO_ID = "11111111-1111-4111-8111-111111111111"
OTHER_REPO_ID = "22222222-2222-4222-8222-222222222222"
INTERVAL = Interval(datetime(2024, 1, 1), datetime(2024, 1, 15))


def _pull_request(
    additions,
    deletions,
    author="alice",
    base_branch="main",
    state=PullRequestState.MERGED,
    repo_id=REPO_ID,
    pr_id=None,
    state_changed_at=None,
):
    # CLUSTOX: a real PullRequest, not the FakePR above, because `additions`
    # and `deletions` are properties reading `meta["code_stats"]` -- a fake with
    # plain attributes would not notice the aggregator reading the wrong key.
    return get_pull_request(
        id=pr_id or uuid4(),
        repo_id=repo_id,
        author=author,
        base_branch=base_branch,
        state=state,
        state_changed_at=state_changed_at or datetime(2024, 1, 3),
        meta={"code_stats": {"additions": additions, "deletions": deletions}},
    )


def _matches_any(value, patterns):
    # Postgres `~` is an unanchored regex match, which is `re.search`.
    return any(re.search(p, value or "") for p in patterns or [] if p is not None)


class FilteringCodeRepoService:
    """Stands in for CodeRepoService, narrowing the way its SQL does."""

    def __init__(self, prs, team_repos=None):
        self._prs = prs
        self._team_repos = (
            team_repos if team_repos is not None else [FakeTeamRepo(REPO_ID)]
        )

    def get_active_team_repos_by_team_id(self, team_id):
        return self._team_repos

    def get_prs_merged_in_interval(self, repo_ids, interval, pr_filter=None):
        prs = [
            pr
            for pr in self._prs
            if str(pr.repo_id) in repo_ids
            # Mirrors _filter_prs_merged_in_interval: merged, and merged in
            # window. An abandoned 5,000-line PR is not delivered work.
            and pr.state == PullRequestState.MERGED
            and interval.from_time <= pr.state_changed_at <= interval.to_time
        ]
        return [pr for pr in prs if self._passes(pr, pr_filter)]

    @staticmethod
    def _passes(pr, pr_filter: PRFilter):
        if pr_filter is None:
            return True

        if pr_filter.authors and pr.author not in pr_filter.authors:
            return False

        if pr_filter.base_branches and not _matches_any(
            pr.base_branch, pr_filter.base_branches
        ):
            return False

        if pr_filter.repo_filters and not any(
            str(pr.repo_id) == repo_id
            and _matches_any(pr.base_branch, (config or {}).get("base_branches"))
            for repo_id, config in pr_filter.repo_filters.items()
        ):
            return False

        excluded = [str(pr_id) for pr_id in pr_filter.excluded_pr_ids or []]
        if str(pr.id) in excluded:
            return False

        return True


def _loc(prs, pr_filter=None):
    return LOCService(FilteringCodeRepoService(prs)).get_team_loc_metrics(
        "team-1", INTERVAL, pr_filter
    )


def test_the_contributor_filter_narrows_the_loc_totals():
    prs = [
        _pull_request(100, 10, author="alice"),
        _pull_request(20, 2, author="bob"),
    ]

    # (100+10 + 20+2) / 2 == 66
    assert _loc(prs) == LOCMetrics(
        additions=120, deletions=12, avg_pr_size=66, avg_daily=9
    )
    # Only alice's PR survives, and the average is hers alone -- not the
    # team-wide 66 that a card ignoring the contributor filter would show.
    assert _loc(prs, PRFilter(authors=["alice"])) == LOCMetrics(
        additions=100, deletions=10, avg_pr_size=110, avg_daily=8
    )


def test_a_base_branches_filter_narrows_the_loc_totals():
    prs = [
        _pull_request(100, 10, base_branch="release/1.0"),
        _pull_request(20, 2, base_branch="main"),
    ]

    assert _loc(prs) == LOCMetrics(
        additions=120, deletions=12, avg_pr_size=66, avg_daily=9
    )
    assert _loc(prs, PRFilter(base_branches=["^release/"])) == LOCMetrics(
        additions=100, deletions=10, avg_pr_size=110, avg_daily=8
    )


def test_prod_branch_mode_narrows_the_loc_totals():
    # CLUSTOX: PROD branch mode arrives as per-repo `repo_filters`, not as the
    # flat `base_branches` above -- the dashboard builds it from each repo's
    # configured prod branches. Two different shapes of the same setting, and
    # only the flat one is exercised elsewhere.
    prs = [
        _pull_request(100, 10, base_branch="main"),
        _pull_request(20, 2, base_branch="feature/x"),
    ]
    prod_mode = PRFilter(repo_filters={REPO_ID: {"base_branches": ["^main$"]}})

    assert _loc(prs) == LOCMetrics(
        additions=120, deletions=12, avg_pr_size=66, avg_daily=9
    )
    assert _loc(prs, prod_mode) == LOCMetrics(
        additions=100, deletions=10, avg_pr_size=110, avg_daily=8
    )


def test_the_excluded_prs_setting_narrows_the_loc_totals():
    excluded_id = "33333333-3333-4333-8333-333333333333"
    prs = [
        _pull_request(100, 10, pr_id=excluded_id),
        _pull_request(20, 2),
    ]

    assert _loc(prs) == LOCMetrics(
        additions=120, deletions=12, avg_pr_size=66, avg_daily=9
    )
    # A generated-code PR an admin excluded must not drag the average up.
    assert _loc(prs, PRFilter(excluded_pr_ids=[excluded_id])) == LOCMetrics(
        additions=20, deletions=2, avg_pr_size=22, avg_daily=2
    )


def test_an_unmerged_pull_request_is_never_counted():
    # CLUSTOX: no filter at all here. Merged-only is not something the caller
    # opts into -- it comes from LOC choosing the merged-in-interval fetch, so
    # a future rewrite reaching for an unfiltered "all PRs" query would show a
    # 5,000-line abandoned PR as delivered work.
    prs = [
        _pull_request(10, 5),
        _pull_request(5000, 4000, state=PullRequestState.OPEN),
    ]

    assert _loc(prs) == LOCMetrics(
        additions=10, deletions=5, avg_pr_size=15, avg_daily=1
    )


def test_a_pr_merged_outside_the_window_is_never_counted():
    prs = [
        _pull_request(10, 5),
        _pull_request(5000, 4000, state_changed_at=datetime(2023, 12, 20)),
    ]

    assert _loc(prs) == LOCMetrics(
        additions=10, deletions=5, avg_pr_size=15, avg_daily=1
    )


def test_a_repo_outside_the_team_is_never_counted():
    prs = [
        _pull_request(10, 5),
        _pull_request(5000, 4000, repo_id=OTHER_REPO_ID),
    ]

    assert _loc(prs) == LOCMetrics(
        additions=10, deletions=5, avg_pr_size=15, avg_daily=1
    )


def test_the_same_filter_narrows_the_loc_trend_buckets():
    # CLUSTOX: trends are a second public entry point, and the card draws the
    # headline and the trend line together. If only one of them honoured the
    # contributor filter the two would disagree on screen, which reads as a
    # data bug rather than a filtering one. 2024-01-01 is a Monday.
    prs = [
        _pull_request(100, 10, author="alice", state_changed_at=datetime(2024, 1, 3)),
        _pull_request(20, 2, author="bob", state_changed_at=datetime(2024, 1, 4)),
    ]
    week = datetime(2024, 1, 1, tzinfo=timezone.utc)

    def trends(pr_filter):
        return LOCService(FilteringCodeRepoService(prs)).get_team_loc_trends(
            "team-1", INTERVAL, pr_filter
        )

    assert trends(None)[week] == LOCMetrics(
        additions=120, deletions=12, avg_pr_size=66, avg_daily=19
    )
    assert trends(PRFilter(authors=["alice"]))[week] == LOCMetrics(
        additions=100, deletions=10, avg_pr_size=110, avg_daily=16
    )


def test_a_filter_that_matches_nothing_reports_zero_rather_than_the_team_total():
    # CLUSTOX: the empty result has to come back as a measured zero, not fall
    # back to unfiltered numbers -- picking a contributor who merged nothing
    # this period must empty the card, not quietly show everyone's totals.
    prs = [_pull_request(100, 10, author="alice")]

    assert _loc(prs, PRFilter(authors=["nobody"])) == LOCMetrics()


def test_avg_daily_is_the_rate_over_the_selected_range():
    # CLUSTOX: 700 gross lines over 7 days is 100/day. The headline this
    # replaces was a period total, which cannot be compared between a week and
    # a month -- the month always looks four times larger for the same pace.
    result = aggregate_loc([_pr(600, 100)], days=7)
    assert result.avg_daily == 100


def test_avg_daily_is_zero_without_a_day_count_rather_than_a_guess():
    # A caller with no interval has no rate. Defaulting to 1 would silently
    # report the period total as if it were a daily figure.
    assert aggregate_loc([_pr(600, 100)]).avg_daily == 0


def test_avg_daily_never_divides_by_zero_on_a_same_day_range():
    from datetime import datetime, timezone

    from mhq.service.code.loc import interval_days

    same_day = Interval(
        datetime(2026, 8, 12, tzinfo=timezone.utc),
        datetime(2026, 8, 12, tzinfo=timezone.utc),
    )
    assert interval_days(same_day) == 1
    assert aggregate_loc([_pr(60, 40)], days=interval_days(same_day)).avg_daily == 100


def test_avg_daily_and_avg_pr_size_are_independent():
    # CLUSTOX: two PRs of 350 lines each over 7 days -- 350 lines/PR but
    # 100 lines/day. They are different quantities and a card showing one
    # while labelling it the other would be plausible and wrong.
    result = aggregate_loc([_pr(300, 50), _pr(300, 50)], days=7)
    assert result.avg_pr_size == 350
    assert result.avg_daily == 100
