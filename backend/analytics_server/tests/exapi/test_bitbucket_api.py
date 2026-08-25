from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest

from mhq.exapi.bitbucket import BitbucketApiService, BitbucketRateLimitExceeded
from mhq.exapi.models.bitbucket import BitbucketPR, BitbucketRepo

# CLUSTOX: fixtures are shaped exactly like Bitbucket Cloud's documented v2
# payloads, not hand-simplified. A test asserting against a simplified shape
# would pass while the adapter misread the real API -- the encode-the-broken-
# shape-back-to-itself failure this project has shipped twice.

BB_PR = {
    "id": 42,
    "title": "feat: add rate limiter",
    "state": "MERGED",
    "author": {
        "uuid": "{a1b2c3d4-0000-4000-8000-000000000001}",
        "nickname": "hamadr",
    },
    "source": {"branch": {"name": "feat/rate-limiter"}},
    "destination": {"branch": {"name": "main"}},
    "created_on": "2026-08-20T10:00:00+00:00",
    "updated_on": "2026-08-21T15:30:00+00:00",
    "merge_commit": {"hash": "abc123def456"},
    "participants": [
        {
            "role": "REVIEWER",
            "approved": True,
            "user": {
                "uuid": "{b2c3d4e5-0000-4000-8000-000000000002}",
                "nickname": "muzz",
            },
            "participated_on": "2026-08-21T12:00:00+00:00",
        }
    ],
    "links": {"html": {"href": "https://bitbucket.org/ws/repo/pull-requests/42"}},
}

BB_REPO = {
    "uuid": "{c3d4e5f6-0000-4000-8000-000000000003}",
    "name": "middleware",
    "slug": "middleware",
    "full_name": "clustox/middleware",
    "description": "DORA metrics",
    "mainbranch": {"name": "main"},
    "workspace": {"slug": "clustox"},
    "links": {"html": {"href": "https://bitbucket.org/clustox/middleware"}},
}


def _response(json_body, status=200, headers=None):
    response = MagicMock()
    response.status_code = status
    response.json.return_value = json_body
    response.headers = headers or {}
    return response


def _service_with_pages(pages):
    service = BitbucketApiService("hamad@clustox.com", "token-123")
    service._session = MagicMock()
    service._session.get.side_effect = [_response(page) for page in pages]
    return service


def test_pagination_follows_next_links():
    page_one = {
        "values": [dict(BB_PR, id=1)],
        "next": "https://api.bitbucket.org/2.0/repositories/ws/repo/pullrequests?page=2",
    }
    page_two = {"values": [dict(BB_PR, id=2)]}
    service = _service_with_pages([page_one, page_two])

    prs = service.get_repo_pull_requests(
        "ws", "repo", datetime(2026, 1, 1, tzinfo=timezone.utc)
    )

    assert [pr["id"] for pr in prs] == [1, 2]
    assert service._session.get.call_count == 2
    # The second call follows the `next` URL verbatim.
    second_url = service._session.get.call_args_list[1].args[0]
    assert second_url == page_one["next"]


def test_pr_listing_requests_all_states():
    # CLUSTOX: without an explicit state list Bitbucket returns ONLY open PRs.
    # Every merged PR would silently vanish from lead time -- data fetched
    # "successfully" and wrong, with no error anywhere to notice.
    service = _service_with_pages([{"values": []}])

    service.get_repo_pull_requests(
        "ws", "repo", datetime(2026, 1, 1, tzinfo=timezone.utc)
    )

    params = service._session.get.call_args_list[0].kwargs["params"]
    assert "MERGED" in str(params.get("state"))
    assert "updated_on" in str(params.get("q"))


def test_429_raises_rate_limit_with_retry_after():
    service = BitbucketApiService("hamad@clustox.com", "token-123")
    service._session = MagicMock()
    service._session.get.return_value = _response(
        {"error": {"message": "Rate limit exceeded"}},
        status=429,
        headers={"Retry-After": "1800"},
    )

    with pytest.raises(BitbucketRateLimitExceeded) as exc:
        service.get_workspaces()

    assert exc.value.retry_after_seconds == 1800


def test_auth_is_basic_session_auth():
    service = BitbucketApiService("hamad@clustox.com", "token-123")

    assert service._session.auth == ("hamad@clustox.com", "token-123")

    # And the token never leaks into a URL.
    service._session = MagicMock()
    service._session.auth = ("hamad@clustox.com", "token-123")
    service._session.get.return_value = _response({"values": []})
    service.get_workspace_repos("clustox")
    for call in service._session.get.call_args_list:
        assert "token-123" not in call.args[0]


def test_repo_model_adapts_the_v2_shape():
    repo = BitbucketRepo(BB_REPO)

    assert repo.name == "middleware"
    assert repo.slug == "middleware"
    assert repo.org_name == "clustox"
    assert repo.default_branch == "main"
    assert repo.idempotency_key == "{c3d4e5f6-0000-4000-8000-000000000003}"
    assert repo.web_url == "https://bitbucket.org/clustox/middleware"


def test_pr_model_adapts_the_v2_shape():
    pr = BitbucketPR(BB_PR)

    assert pr.number == 42
    assert pr.state == "MERGED"
    assert pr.author_uuid == "{a1b2c3d4-0000-4000-8000-000000000001}"
    assert pr.author_nickname == "hamadr"
    assert pr.head_branch == "feat/rate-limiter"
    assert pr.base_branch == "main"
    assert pr.merge_commit_sha == "abc123def456"
    assert pr.url == "https://bitbucket.org/ws/repo/pull-requests/42"
    assert pr.updated_on == datetime(2026, 8, 21, 15, 30, tzinfo=timezone.utc)


def test_pr_model_tolerates_null_merge_commit():
    # CLUSTOX: `merge_commit` is null on every unmerged PR -- the common case,
    # not an edge case.
    open_pr = dict(BB_PR, state="OPEN", merge_commit=None)

    pr = BitbucketPR(open_pr)

    assert pr.state == "OPEN"
    assert pr.merge_commit_sha is None


def test_pr_commits_paginate_like_everything_else():
    # CLUSTOX: commits feed first_commit_to_open in lead time -- a handler
    # that skips them would degrade one lead-time stage to zero silently.
    page = {
        "values": [
            {
                "hash": "abc123",
                "message": "feat: thing",
                "date": "2026-08-20T09:00:00+00:00",
                "author": {"raw": "Hamad <hamad@clustox.com>"},
                "links": {
                    "html": {"href": "https://bitbucket.org/ws/repo/commits/abc123"}
                },
            }
        ]
    }
    service = _service_with_pages([page])

    commits = service.get_pr_commits("ws", "repo", 42)

    assert commits[0]["hash"] == "abc123"


def test_workspaces_use_the_permissions_endpoint_not_the_dead_one():
    # CLUSTOX: /2.0/workspaces returns 410 "CHANGE-2770 - Functionality has
    # been deprecated" -- discovered live, after every fixture test passed
    # against it. This pins the replacement URL so a refactor cannot drift
    # back to the dead endpoint.
    service = _service_with_pages(
        [{"values": [{"workspace": {"slug": "clustox"}}, {"not_a_workspace": 1}]}]
    )

    workspaces = service.get_workspaces()

    url = service._session.get.call_args_list[0].args[0]
    assert url.endswith("/2.0/user/permissions/workspaces")
    assert workspaces == [{"slug": "clustox"}]
