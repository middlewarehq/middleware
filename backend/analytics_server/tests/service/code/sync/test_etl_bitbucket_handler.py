from datetime import datetime, timezone
from uuid import uuid4

from mhq.service.code.sync.etl_bitbucket_handler import BitbucketETLHandler
from mhq.store.models.code import (
    CodeProvider,
    PullRequestEventState,
    PullRequestState,
)
from tests.exapi.test_bitbucket_api import BB_PR


# CLUSTOX: a fake, not a mock -- it narrows and returns exactly what the real
# client's contract promises, so these tests exercise the handler's adaptation
# rather than restating its internals.
class FakeBitbucketApiService:
    def __init__(self, prs=None, activity=None, diffstat=None, commits=None):
        self._prs = prs or []
        self._activity = activity if activity is not None else []
        self._diffstat = diffstat if diffstat is not None else []
        self._commits = commits if commits is not None else []

    def get_repo_pull_requests(self, workspace, repo_slug, updated_since):
        return self._prs

    def get_pr_activity(self, workspace, repo_slug, pr_id):
        return self._activity

    def get_pr_diffstat(self, workspace, repo_slug, pr_id):
        return self._diffstat

    def get_pr_commits(self, workspace, repo_slug, pr_id):
        return self._commits


class FakeCodeRepoService:
    def get_repo_pr_by_number(self, repo_id, number):
        return None

    def get_pr_events(self, pr_model):
        return []


class _Repo:
    def __init__(self):
        self.id = uuid4()
        self.org_name = "clustox"
        self.slug = "middleware"
        self.idempotency_key = "{c3d4e5f6-0000-4000-8000-000000000003}"


def _handler(api):
    from mhq.service.code.sync.etl_code_analytics import CodeETLAnalyticsService

    return BitbucketETLHandler(
        org_id="org-1",
        bitbucket_api_service=api,
        code_repo_service=FakeCodeRepoService(),
        code_etl_analytics_service=CodeETLAnalyticsService(),
        bitbucket_revert_pr_sync_handler=None,
    )


def _sync(prs, **api_kwargs):
    handler = _handler(FakeBitbucketApiService(prs=prs, **api_kwargs))
    return handler.get_repo_pull_requests_data(
        _Repo(), datetime(2026, 1, 1, tzinfo=timezone.utc)
    )


def test_state_mapping_covers_all_four_bitbucket_states():
    prs = [
        dict(BB_PR, id=1, state="MERGED"),
        dict(BB_PR, id=2, state="OPEN", merge_commit=None),
        dict(BB_PR, id=3, state="DECLINED", merge_commit=None),
        dict(BB_PR, id=4, state="SUPERSEDED", merge_commit=None),
    ]

    pull_requests, _, _ = _sync(prs)

    states = {pr.number: pr.state for pr in pull_requests}
    assert states[1] == PullRequestState.MERGED
    assert states[2] == PullRequestState.OPEN
    # CLUSTOX: DECLINED and SUPERSEDED both fold into CLOSED -- our model has
    # three states, Bitbucket four.
    assert states[3] == PullRequestState.CLOSED
    assert states[4] == PullRequestState.CLOSED


def test_unknown_state_skips_that_pr_not_the_batch():
    prs = [
        dict(BB_PR, id=1, state="MERGED"),
        dict(BB_PR, id=2, state="SOMETHING_NEW", merge_commit=None),
        dict(BB_PR, id=3, state="OPEN", merge_commit=None),
    ]

    pull_requests, _, _ = _sync(prs)

    assert [pr.number for pr in pull_requests] == [1, 3]


def test_merged_pr_state_changed_at_is_updated_on():
    # CLUSTOX: Bitbucket has no merged_at field anywhere in the PR object.
    # updated_on at the moment of merge is the closest truth, and it is what
    # lead time keys on -- this pin is the whole reason the test exists.
    pull_requests, _, _ = _sync([BB_PR])

    assert pull_requests[0].state_changed_at == datetime(
        2026, 8, 21, 15, 30, tzinfo=timezone.utc
    )


def test_open_pr_has_no_merge_commit_sha():
    pull_requests, _, _ = _sync([dict(BB_PR, state="OPEN", merge_commit=None)])

    assert pull_requests[0].merge_commit_sha is None


def test_author_is_the_nickname_with_uuid_fallback():
    # CLUSTOX: nickname, not uuid. The contributor dropdown lists `author`
    # strings verbatim -- storing the uuid would put "{a1b2c3d4-...}" in the
    # UI. The uuid stays available in `data` for a future identity layer.
    pull_requests, _, _ = _sync([BB_PR])
    assert pull_requests[0].author == "hamadr"

    no_nickname = dict(BB_PR, author={"uuid": "{u-1}"})
    pull_requests, _, _ = _sync([no_nickname])
    assert pull_requests[0].author == "{u-1}"


def test_provider_and_url_come_through():
    pull_requests, _, _ = _sync([BB_PR])

    assert pull_requests[0].provider == CodeProvider.BITBUCKET.value
    assert pull_requests[0].url == "https://bitbucket.org/ws/repo/pull-requests/42"


def test_reviewers_on_a_merged_pr_come_from_review_events():
    # CLUSTOX: create_pr_metrics -- shared with GitHub and GitLab -- REBUILDS
    # `reviewers` from the review events' actors for every non-open PR. The
    # participants list only survives on OPEN PRs. Asserting participants on a
    # merged PR would pin a contract the shared analytics layer deliberately
    # overrides.
    activity = [
        {
            "approval": {
                "date": "2026-08-21T12:00:00+00:00",
                "user": {"uuid": "{u-2}", "nickname": "muzz"},
            }
        }
    ]

    pull_requests, _, _ = _sync([BB_PR], activity=activity)

    assert pull_requests[0].reviewers == ["muzz"]


def test_reviewers_on_an_open_pr_are_the_reviewer_role_participants():
    pr = dict(
        BB_PR,
        state="OPEN",
        merge_commit=None,
        participants=[
            {
                "role": "REVIEWER",
                "approved": False,
                "user": {"uuid": "{u-2}", "nickname": "muzz"},
                "participated_on": "2026-08-21T12:00:00+00:00",
            },
            {
                "role": "PARTICIPANT",
                "approved": False,
                "user": {"uuid": "{u-3}", "nickname": "drive-by"},
                "participated_on": "2026-08-21T13:00:00+00:00",
            },
        ],
    )

    pull_requests, _, _ = _sync([pr])

    assert pull_requests[0].reviewers == ["muzz"]


class RateLimitingApiService(FakeBitbucketApiService):
    """Raises 429 when asked for the activity of `explode_at_pr`."""

    def __init__(self, prs, explode_at_pr):
        super().__init__(prs=prs)
        self._explode_at_pr = explode_at_pr

    def get_pr_activity(self, workspace, repo_slug, pr_id):
        if pr_id == self._explode_at_pr:
            from mhq.exapi.bitbucket import BitbucketRateLimitExceeded

            raise BitbucketRateLimitExceeded("limited", retry_after_seconds=1800)
        return []


class BrokenDiffstatApiService(FakeBitbucketApiService):
    def get_pr_diffstat(self, workspace, repo_slug, pr_id):
        raise RuntimeError("diffstat exploded")


def test_activity_becomes_review_events_with_states_and_actors():
    activity = [
        {
            "comment": {
                "id": 9001,
                "created_on": "2026-08-20T11:00:00+00:00",
                "user": {"nickname": "muzz"},
                "content": {"raw": "nit: rename this"},
            }
        },
        {
            "approval": {
                "date": "2026-08-21T12:00:00+00:00",
                "user": {"nickname": "muzz"},
            }
        },
        # An update entry -- present in every real feed, not a review.
        {"update": {"state": "OPEN", "date": "2026-08-20T10:30:00+00:00"}},
    ]

    pull_requests, _, events = _sync([BB_PR], activity=activity)

    assert len(events) == 2
    states = sorted(e.data["state"] for e in events)
    # CLUSTOX: asserted via the enum, because the analytics layer compares
    # data["state"] == PullRequestEventState.X.value -- the literal casing is
    # the contract, and uppercase here would silently break first-response
    # and rework detection downstream.
    assert states == sorted(
        [
            PullRequestEventState.APPROVED.value,
            PullRequestEventState.COMMENTED.value,
        ]
    )
    assert all(e.actor_username == "muzz" for e in events)
    # The earliest review drives first_response_time; it must be non-None
    # once a review event exists on a merged PR.
    assert pull_requests[0].first_response_time is not None


def test_malformed_activity_entry_skips_that_entry_not_the_batch():
    activity = [
        {"approval": {"date": None, "user": None}},
        {"comment": "not-even-a-dict"},
        {
            "approval": {
                "date": "2026-08-21T12:00:00+00:00",
                "user": {"nickname": "muzz"},
            }
        },
    ]

    _, _, events = _sync([BB_PR], activity=activity)

    assert len(events) == 1
    assert events[0].data["state"] == PullRequestEventState.APPROVED.value


def test_diffstat_sums_land_in_code_stats():
    diffstat = [
        {"lines_added": 100, "lines_removed": 20, "status": "modified"},
        {"lines_added": 30, "lines_removed": 5, "status": "added"},
    ]

    pull_requests, _, _ = _sync([BB_PR], diffstat=diffstat)

    stats = pull_requests[0].meta["code_stats"]
    assert stats["additions"] == 130
    assert stats["deletions"] == 25
    assert stats["changed_files"] == 2


def test_diffstat_failure_keeps_the_pr_and_omits_code_stats():
    # CLUSTOX: the diffstat is a separate request and can fail independently.
    # The PR must stay (lead time, contributor filter) with code_stats absent
    # -- LOC undercounts honestly. Dropping the PR would corrupt four metrics
    # to protect one; writing zeros would claim an empty diff that never was.
    handler = _handler(BrokenDiffstatApiService(prs=[BB_PR]))

    pull_requests, _, _ = handler.get_repo_pull_requests_data(
        _Repo(), datetime(2026, 1, 1, tzinfo=timezone.utc)
    )

    assert len(pull_requests) == 1
    assert "code_stats" not in pull_requests[0].meta
    # The model property reads 0 through its own default -- measured-nothing,
    # not a crash.
    assert pull_requests[0].additions == 0


def test_429_keeps_already_processed_prs_and_stops():
    prs = [
        dict(BB_PR, id=1),
        dict(BB_PR, id=2),
        dict(BB_PR, id=3),
        dict(BB_PR, id=4),
    ]
    handler = _handler(RateLimitingApiService(prs, explode_at_pr=3))

    pull_requests, _, _ = handler.get_repo_pull_requests_data(
        _Repo(), datetime(2026, 1, 1, tzinfo=timezone.utc)
    )

    assert [pr.number for pr in pull_requests] == [1, 2]


def test_429_does_not_advance_past_unfetched_prs():
    # CLUSTOX: the caller advances the bookmark to the newest returned PR's
    # updated_on. PRs 3 and 4 were not returned, so the resume point must not
    # cover them -- covering them would lose their data forever, the worse of
    # the two bookmark failure directions.
    prs = [
        dict(BB_PR, id=1, updated_on="2026-08-21T10:00:00+00:00"),
        dict(BB_PR, id=2, updated_on="2026-08-21T11:00:00+00:00"),
        dict(BB_PR, id=3, updated_on="2026-08-21T12:00:00+00:00"),
        dict(BB_PR, id=4, updated_on="2026-08-21T13:00:00+00:00"),
    ]
    handler = _handler(RateLimitingApiService(prs, explode_at_pr=3))

    pull_requests, _, _ = handler.get_repo_pull_requests_data(
        _Repo(), datetime(2026, 1, 1, tzinfo=timezone.utc)
    )

    newest_returned = max(pr.updated_at for pr in pull_requests)
    assert newest_returned == datetime(2026, 8, 21, 11, 0, tzinfo=timezone.utc)


def test_merged_pr_commits_are_adapted():
    commits = [
        {
            "hash": "abc123",
            "message": "feat: thing",
            "date": "2026-08-20T09:00:00+00:00",
            "author": {"raw": "Hamad <hamad@clustox.com>"},
            "links": {"html": {"href": "https://bitbucket.org/ws/repo/commits/abc123"}},
        },
        {"message": "corrupt commit with no hash"},
    ]

    _, pr_commits, _ = _sync([BB_PR], commits=commits)

    assert len(pr_commits) == 1
    assert pr_commits[0].hash == "abc123"
    assert pr_commits[0].author == "Hamad <hamad@clustox.com>"
