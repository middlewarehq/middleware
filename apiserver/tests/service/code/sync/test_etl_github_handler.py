from datetime import datetime

import pytz

from dora.service.code.sync.etl_github_handler import GithubETLHandler
from dora.utils.string import uuid4_str
from tests.factories.models import get_pull_request, get_pull_request_commit
from tests.factories.models.exapi.github import get_github_commit_dict
from tests.utilities import compare_objects_as_dicts

ORG_ID = uuid4_str()


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

    commits = [
        commit1,
        commit2,
        commit3
    ]
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
        )
    ]

    for commit, expected_commit in zip(pr_commits, expected_pr_commits):
        assert compare_objects_as_dicts(commit, expected_commit) is True


def test__dt_from_github_dt_string_given_date_string_returns_correct_datetime():
    date_string = "2024-04-18T10:53:15Z"
    expected = datetime(2024, 4, 18, 10, 53, 15, tzinfo=pytz.UTC)
    assert GithubETLHandler._dt_from_github_dt_string(date_string) == expected
