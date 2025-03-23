from datetime import datetime

import pytz

from mhq.service.code.sync.etl_github_handler import GithubETLHandler
from mhq.store.models.code import PullRequestState
from mhq.utils.string import uuid4_str
from tests.factories.models import (
    get_pull_request,
    get_pull_request_commit,
    get_pull_request_event,
)
from tests.factories.models.exapi.github import (
    get_github_commit_dict,
    get_github_pull_request_review,
    get_github_pull_request,
)
from tests.utilities import compare_objects_as_dicts

ORG_ID = uuid4_str()


def test__to_pr_model_given_a_github_pr_returns_new_pr_model():
    repo_id = uuid4_str()
    number = 123
    user_login = "abc"
    merged_at = datetime(2022, 6, 29, 10, 53, 15, tzinfo=pytz.UTC)
    head_branch = "feature"
    base_branch = "main"
    title = "random_title"
    review_comments = 3
    merge_commit_sha = "123456789098765"

    github_pull_request = get_github_pull_request(
        number=number,
        merged_at=merged_at,
        head_ref=head_branch,
        base_ref=base_branch,
        user_login=user_login,
        merge_commit_sha=merge_commit_sha,
        commits=3,
        additions=10,
        deletions=5,
        changed_files=2,
    )

    github_etl_handler = GithubETLHandler(ORG_ID, None, None, None, None)
    pr_model = github_etl_handler._to_pr_model(
        pr=github_pull_request,
        pr_model=None,
        repo_id=repo_id,
        review_comments=review_comments,
    )

    expected_pr_model = get_pull_request(
        repo_id=repo_id,
        number=str(number),
        author=str(user_login),
        state=PullRequestState.MERGED,
        title=title,
        head_branch=head_branch,
        base_branch=base_branch,
        provider="github",
        requested_reviews=[],
        data=github_pull_request.raw_data,
        state_changed_at=merged_at,
        meta={
            "code_stats": {
                "commits": 3,
                "additions": 10,
                "deletions": 5,
                "changed_files": 2,
                "comments": review_comments,
            },
            "user_profile": {
                "username": user_login,
            },
        },
        reviewers=[],
        merge_commit_sha=merge_commit_sha,
    )
    # Ignoring the following fields as they are generated as side effects and are not part of the actual data
    # reviewers, rework_time, first_commit_to_open, first_response_time, lead_time, merge_time, merge_to_deploy, cycle_time
    assert (
        compare_objects_as_dicts(
            pr_model,
            expected_pr_model,
            [
                "id",
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
            ],
        )
        is True
    )


def test__to_pr_model_given_a_github_pr_and_db_pr_returns_updated_pr_model():
    repo_id = uuid4_str()
    number = 123
    user_login = "abc"
    merged_at = datetime(2022, 6, 29, 10, 53, 15, tzinfo=pytz.UTC)
    head_branch = "feature"
    base_branch = "main"
    title = "random_title"
    review_comments = 3
    merge_commit_sha = "123456789098765"

    github_pull_request = get_github_pull_request(
        number=number,
        merged_at=merged_at,
        head_ref=head_branch,
        base_ref=base_branch,
        user_login=user_login,
        merge_commit_sha=merge_commit_sha,
        commits=3,
        additions=10,
        deletions=5,
        changed_files=2,
    )

    given_pr_model = get_pull_request(
        repo_id=repo_id,
        number=str(number),
        provider="github",
    )

    github_etl_handler = GithubETLHandler(ORG_ID, None, None, None, None)
    pr_model = github_etl_handler._to_pr_model(
        pr=github_pull_request,
        pr_model=given_pr_model,
        repo_id=repo_id,
        review_comments=review_comments,
    )

    expected_pr_model = get_pull_request(
        id=given_pr_model.id,
        repo_id=repo_id,
        number=str(number),
        author=str(user_login),
        state=PullRequestState.MERGED,
        title=title,
        head_branch=head_branch,
        base_branch=base_branch,
        provider="github",
        requested_reviews=[],
        data=github_pull_request.raw_data,
        state_changed_at=merged_at,
        meta={
            "code_stats": {
                "commits": 3,
                "additions": 10,
                "deletions": 5,
                "changed_files": 2,
                "comments": review_comments,
            },
            "user_profile": {
                "username": user_login,
            },
        },
        reviewers=[],
        merge_commit_sha=merge_commit_sha,
    )
    # Ignoring the following fields as they are generated as side effects and are not part of the actual data
    # reviewers, rework_time, first_commit_to_open, first_response_time, lead_time, merge_time, merge_to_deploy, cycle_time
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
            ],
        )
        is True
    )


def test__to_pr_events_given_an_empty_list_of_events_returns_an_empty_list():
    pr_model = get_pull_request()
    assert GithubETLHandler._to_pr_events([], pr_model, []) == []


def test__to_pr_events_given_a_list_of_only_new_events_returns_a_list_of_pr_events():
    pr_model = get_pull_request()
    event1 = get_github_pull_request_review()
    event2 = get_github_pull_request_review()
    events = [event1, event2]

    pr_events = GithubETLHandler._to_pr_events(events, pr_model, [])

    expected_pr_events = [
        get_pull_request_event(
            pull_request_id=str(pr_model.id),
            org_repo_id=pr_model.repo_id,
            data=event1.raw_data,
            created_at=event1.submitted_at,
            type="REVIEW",
            idempotency_key=event1.id,
            reviewer=event1.user_login,
        ),
        get_pull_request_event(
            pull_request_id=str(pr_model.id),
            org_repo_id=pr_model.repo_id,
            data=event2.raw_data,
            created_at=event2.submitted_at,
            type="REVIEW",
            idempotency_key=event2.id,
            reviewer=event2.user_login,
        ),
    ]

    for event, expected_event in zip(pr_events, expected_pr_events):
        assert compare_objects_as_dicts(event, expected_event, ["id"]) is True


def test__to_pr_events_given_a_list_of_new_events_and_old_events_returns_a_list_of_pr_events():
    pr_model = get_pull_request()
    event1 = get_github_pull_request_review()
    event2 = get_github_pull_request_review()
    events = [event1, event2]

    old_event = get_pull_request_event(
        pull_request_id=str(pr_model.id),
        org_repo_id=pr_model.repo_id,
        data=event1.raw_data,
        created_at=event1.submitted_at,
        type="REVIEW",
        idempotency_key=event1.id,
        reviewer=event1.user_login,
    )

    pr_events = GithubETLHandler._to_pr_events(events, pr_model, [old_event])

    expected_pr_events = [
        old_event,
        get_pull_request_event(
            pull_request_id=str(pr_model.id),
            org_repo_id=pr_model.repo_id,
            data=event2.raw_data,
            created_at=event2.submitted_at,
            type="REVIEW",
            idempotency_key=event2.id,
            reviewer=event2.user_login,
        ),
    ]

    for event, expected_event in zip(pr_events, expected_pr_events):
        assert compare_objects_as_dicts(event, expected_event, ["id"]) is True


def test__to_pr_commits_given_an_empty_list_of_commits_returns_an_empty_list():
    pr_model = get_pull_request()
    github_etl_handler = GithubETLHandler(ORG_ID, None, None, None, None)
    assert github_etl_handler._to_pr_commits([], pr_model) == []


def test__to_pr_commits_given_a_list_of_commits_returns_a_list_of_pr_commits():
    pr_model = get_pull_request()
    common_url = "random_url"
    common_message = "random_message"
    sha1 = "123456789098765"
    author1 = "author_abc"
    created_at1 = "2022-06-29T10:53:15Z"
    commit1 = get_github_commit_dict(
        sha=sha1,
        author_login=author1,
        created_at=created_at1,
        url=common_url,
        message=common_message,
    )
    sha2 = "987654321234567"
    author2 = "author_xyz"
    created_at2 = "2022-06-29T12:53:15Z"
    commit2 = get_github_commit_dict(
        sha=sha2,
        author_login=author2,
        created_at=created_at2,
        url=common_url,
        message=common_message,
    )
    sha3 = "543216789098765"
    author3 = "author_abc"
    created_at3 = "2022-06-29T15:53:15Z"
    commit3 = get_github_commit_dict(
        sha=sha3,
        author_login=author3,
        created_at=created_at3,
        url=common_url,
        message=common_message,
    )

    commits = [commit1, commit2, commit3]
    github_etl_handler = GithubETLHandler(ORG_ID, None, None, None, None)
    pr_commits = github_etl_handler._to_pr_commits(commits, pr_model)

    expected_pr_commits = [
        get_pull_request_commit(
            pr_id=str(pr_model.id),
            org_repo_id=pr_model.repo_id,
            hash=sha1,
            author=author1,
            url=common_url,
            message=common_message,
            created_at=datetime(2022, 6, 29, 10, 53, 15, tzinfo=pytz.UTC),
            data=commit1,
        ),
        get_pull_request_commit(
            pr_id=str(pr_model.id),
            org_repo_id=pr_model.repo_id,
            hash=sha2,
            author=author2,
            url=common_url,
            message=common_message,
            created_at=datetime(2022, 6, 29, 12, 53, 15, tzinfo=pytz.UTC),
            data=commit2,
        ),
        get_pull_request_commit(
            pr_id=str(pr_model.id),
            org_repo_id=pr_model.repo_id,
            hash=sha3,
            author=author3,
            url=common_url,
            message=common_message,
            created_at=datetime(2022, 6, 29, 15, 53, 15, tzinfo=pytz.UTC),
            data=commit3,
        ),
    ]

    for commit, expected_commit in zip(pr_commits, expected_pr_commits):
        assert compare_objects_as_dicts(commit, expected_commit) is True

def test_get_first_ready_for_review_event_returns_earliest_ready_event():
    class MockTimelineEvent:
        def __init__(self, event_type, created_at):
            self.event = event_type
            self.created_at = created_at

    earlier_date = datetime(2024, 1, 1, 10, 0, 0, tzinfo=pytz.UTC)
    later_date = datetime(2024, 1, 2, 10, 0, 0, tzinfo=pytz.UTC)

    events = [
        MockTimelineEvent("other_event", earlier_date),
        MockTimelineEvent("ready_for_review", later_date),
        MockTimelineEvent("ready_for_review", earlier_date),
        MockTimelineEvent("another_event", later_date),
    ]

    github_etl_handler = GithubETLHandler(ORG_ID, None, None, None, None)
    result = github_etl_handler.get_first_ready_for_review_event(events)

    assert result == earlier_date

def test_get_first_ready_for_review_event_returns_none_when_no_ready_events():
    class MockTimelineEvent:
        def __init__(self, event_type, created_at):
            self.event = event_type
            self.created_at = created_at

    date = datetime(2024, 1, 1, 10, 0, 0, tzinfo=pytz.UTC)
    events = [
        MockTimelineEvent("other_event", date),
        MockTimelineEvent("another_event", date),
    ]

    github_etl_handler = GithubETLHandler(ORG_ID, None, None, None, None)
    result = github_etl_handler.get_first_ready_for_review_event(events)

    assert result is None

def test_get_first_ready_for_review_event_handles_empty_list():
    github_etl_handler = GithubETLHandler(ORG_ID, None, None, None, None)
    result = github_etl_handler.get_first_ready_for_review_event([])

    assert result is None

def test__dt_from_github_dt_string_given_date_string_returns_correct_datetime():
    date_string = "2024-04-18T10:53:15Z"
    expected = datetime(2024, 4, 18, 10, 53, 15, tzinfo=pytz.UTC)
    assert GithubETLHandler._dt_from_github_dt_string(date_string) == expected
