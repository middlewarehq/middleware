from datetime import datetime
import pytz
from tests.factories.models.exapi.gitlab import (
    get_gitlab_commit,
    get_gitlab_pull_request_review,
)
from tests.factories.models.code import (
    get_pull_request,
    get_pull_request_commit,
    get_pull_request_event,
)
from tests.factories.models.exapi.gitlab import get_gitlab_pull_request
from tests.utilities import compare_objects_as_dicts
from mhq.service.code.sync.etl_gitlab_handler import GitlabETLHandler
from mhq.utils.string import uuid4_str
from mhq.store.models.code import PullRequestState


def test__to_pr_model_given_a_gitlab_pr_returns_new_pr_model():
    repo_id = uuid4_str()
    number = 123
    merged_at = datetime(2022, 6, 29, 10, 53, 15, tzinfo=pytz.UTC)
    head_branch = "feature"
    base_branch = "main"
    title = "Test PR"
    merge_commit_sha = "abcdef1234567890"
    author = "gitlab_user"

    gitlab_pr = get_gitlab_pull_request(
        number=number,
        merged_at=merged_at,
        head_ref=head_branch,
        base_ref=base_branch,
        title=title,
        merge_commit_sha=merge_commit_sha,
        author=author,
    )
    gitlab_etl_handler = GitlabETLHandler("org_id", None, None, None, None)

    pr_model = gitlab_etl_handler._to_pr_model(
        pr=gitlab_pr,
        pr_model=None,
        repo_id=repo_id,
    )

    expected_pr_model = get_pull_request(
        repo_id=repo_id,
        number=str(number),
        author=author,
        state=PullRequestState.MERGED,
        title=title,
        head_branch=head_branch,
        base_branch=base_branch,
        provider="gitlab",
        requested_reviews=[],
        data=gitlab_pr.data,
        state_changed_at=merged_at,
        meta={},
        reviewers=[],
        merge_commit_sha=merge_commit_sha,
    )
    assert (
        compare_objects_as_dicts(
            pr_model,
            expected_pr_model,
            [
                "created_at",
                "updated_at",
                "reviewers",
                "rework_time",
                "first_commit_to_open",
                "first_response_time",
                "lead_time",
                "merge_time",
                "merge_to_deploy",
                "cycle_time",
                "id",
            ],
        )
        is True
    )


def test__to_pr_model_given_a_gitlab_pr_and_db_pr_returns_updated_pr_model():
    repo_id = uuid4_str()
    number = 123
    merged_at = datetime(2022, 6, 29, 10, 53, 15, tzinfo=pytz.UTC)
    head_branch = "feature"
    base_branch = "main"
    title = "Test PR"
    merge_commit_sha = "abcdef1234567890"
    author = "gitlab_user"

    gitlab_pr = get_gitlab_pull_request(
        number=number,
        merged_at=merged_at,
        head_ref=head_branch,
        base_ref=base_branch,
        title=title,
        merge_commit_sha=merge_commit_sha,
        author=author,
    )
    gitlab_etl_handler = GitlabETLHandler("org_id", None, None, None, None)
    given_pr_model = get_pull_request(
        repo_id=repo_id,
        number=str(number),
        provider="gitlab",
    )

    pr_model = gitlab_etl_handler._to_pr_model(
        pr=gitlab_pr,
        pr_model=given_pr_model,
        repo_id=repo_id,
    )

    expected_pr_model = get_pull_request(
        id=given_pr_model.id,
        repo_id=repo_id,
        number=str(number),
        author=author,
        state=PullRequestState.MERGED,
        title=title,
        head_branch=head_branch,
        base_branch=base_branch,
        provider="gitlab",
        requested_reviews=[],
        data=gitlab_pr.data,
        state_changed_at=merged_at,
        meta={},
        reviewers=[],
        merge_commit_sha=merge_commit_sha,
    )
    assert (
        compare_objects_as_dicts(
            pr_model,
            expected_pr_model,
            [
                "created_at",
                "updated_at",
                "reviewers",
                "rework_time",
                "first_commit_to_open",
                "first_response_time",
                "lead_time",
                "merge_time",
                "merge_to_deploy",
                "cycle_time",
                "data",
            ],
        )
        is True
    )


def test__to_pr_events_given_an_empty_list_of_events_returns_an_empty_list():
    pr_model = get_pull_request()
    assert GitlabETLHandler._to_pr_events([], pr_model, []) == []


def test__to_pr_events_given_a_list_of_only_new_events_returns_a_list_of_pr_events():
    pr_model = get_pull_request()
    event1 = get_gitlab_pull_request_review()
    event2 = get_gitlab_pull_request_review()
    events = [event1, event2]

    pr_events = GitlabETLHandler._to_pr_events(events, pr_model, [])

    expected_pr_events = [
        get_pull_request_event(
            pull_request_id=str(pr_model.id),
            org_repo_id=pr_model.repo_id,
            data=event1.data,
            created_at=event1.created_at,
            type="REVIEW",
            idempotency_key=event1.idempotency_key,
            reviewer=event1.actor_username,
        ),
        get_pull_request_event(
            pull_request_id=str(pr_model.id),
            org_repo_id=pr_model.repo_id,
            data=event2.data,
            created_at=event2.created_at,
            type="REVIEW",
            idempotency_key=event2.idempotency_key,
            reviewer=event2.actor_username,
        ),
    ]

    for event, expected_event in zip(pr_events, expected_pr_events):
        assert compare_objects_as_dicts(event, expected_event, ["id"]) is True


def test__to_pr_events_given_a_list_of_new_events_and_old_events_returns_a_list_of_pr_events():
    pr_model = get_pull_request()
    event1 = get_gitlab_pull_request_review()
    event2 = get_gitlab_pull_request_review()
    events = [event1, event2]

    old_event = get_pull_request_event(
        pull_request_id=str(pr_model.id),
        org_repo_id=pr_model.repo_id,
        data=event1.data,
        created_at=event1.created_at,
        type="REVIEW",
        idempotency_key=event1.idempotency_key,
        reviewer=event1.actor_username,
    )

    pr_events = GitlabETLHandler._to_pr_events(events, pr_model, [old_event])

    expected_pr_events = [
        old_event,
        get_pull_request_event(
            pull_request_id=str(pr_model.id),
            org_repo_id=pr_model.repo_id,
            data=event2.data,
            created_at=event2.created_at,
            type="REVIEW",
            idempotency_key=event2.idempotency_key,
            reviewer=event2.actor_username,
        ),
    ]

    for event, expected_event in zip(pr_events, expected_pr_events):
        assert compare_objects_as_dicts(event, expected_event, ["id", "data"]) is True


def test__to_pr_commits_given_an_empty_list_of_commits_returns_an_empty_list():
    pr_model = get_pull_request()
    gitlab_etl_handler = GitlabETLHandler("org_id", None, None, None, None)
    assert gitlab_etl_handler._to_pr_commits([], pr_model) == []


def test__to_pr_commits_given_a_list_of_commits_returns_a_list_of_pr_commits():
    pr_model = get_pull_request()
    common_url = "random_url"
    common_message = "random_message"
    sha1 = "123456789098765"
    author1 = "author_abc"
    commit1 = get_gitlab_commit(
        sha=sha1,
        author_login=author1,
        url=common_url,
        message=common_message,
    )
    sha2 = "987654321234567"
    author2 = "author_xyz"
    commit2 = get_gitlab_commit(
        sha=sha2,
        author_login=author2,
        url=common_url,
        message=common_message,
    )
    sha3 = "543216789098765"
    author3 = "author_abc"
    commit3 = get_gitlab_commit(
        sha=sha3,
        author_login=author3,
        url=common_url,
        message=common_message,
    )

    commits = [commit1, commit2, commit3]
    gitlab_etl_handler = GitlabETLHandler("org_id", None, None, None, None)
    pr_commits = gitlab_etl_handler._to_pr_commits(commits, pr_model)

    expected_pr_commits = [
        get_pull_request_commit(
            pr_id=pr_model.id,
            org_repo_id=pr_model.repo_id,
            hash=sha1,
            author=author1,
            url=common_url,
            message=common_message,
            data=commit1.data,
        ),
        get_pull_request_commit(
            pr_id=pr_model.id,
            org_repo_id=pr_model.repo_id,
            hash=sha2,
            author=author2,
            url=common_url,
            message=common_message,
            data=commit2.data,
        ),
        get_pull_request_commit(
            pr_id=pr_model.id,
            org_repo_id=pr_model.repo_id,
            hash=sha3,
            author=author3,
            url=common_url,
            message=common_message,
            data=commit3.data,
        ),
    ]

    for commit, expected_commit in zip(pr_commits, expected_pr_commits):
        assert compare_objects_as_dicts(commit, expected_commit, ["created_at"]) is True
