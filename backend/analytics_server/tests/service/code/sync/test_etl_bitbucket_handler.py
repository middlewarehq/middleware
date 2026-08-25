from datetime import datetime, timezone
from uuid import uuid4

from mhq.service.code.sync.etl_bitbucket_handler import BitbucketETLHandler
from mhq.store.models.code import CodeProvider, PullRequestState
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
