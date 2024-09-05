from mhq.exapi.models.gitlab import GitlabCommit, GitlabNote, GitlabPR, GitlabPRState
from mhq.utils.time import time_now
from datetime import datetime


def get_gitlab_pull_request(
    number: int = 1,
    merged_at: datetime = time_now(),
    closed_at: datetime = time_now(),
    title: str = "random_title",
    html_url: str = None,
    created_at: datetime = time_now(),
    updated_at: datetime = time_now(),
    base_ref: str = "main",
    head_ref: str = "feature",
    merge_commit_sha: str = "123456",
    author: str = "gitlab_user",
    state: str = GitlabPRState.MERGED.value,
) -> GitlabPR:
    return GitlabPR(
        {
            "iid": number,
            "title": title,
            "web_url": html_url,
            "author": {"username": author},
            "state": state,
            "source_branch": head_ref,
            "target_branch": base_ref,
            "created_at": created_at.strftime("%Y-%m-%dT%H:%M:%S.%f%z"),
            "closed_at": closed_at.strftime("%Y-%m-%dT%H:%M:%S.%f%z"),
            "updated_at": updated_at.strftime("%Y-%m-%dT%H:%M:%S.%f%z"),
            "merged_at": merged_at.strftime("%Y-%m-%dT%H:%M:%S.%f%z"),
            "merge_commit_sha": merge_commit_sha,
            "reviewers": [],
            "merged_by": (
                {"username": author} if state == GitlabPRState.MERGED.value else None
            ),
        }
    )


def get_gitlab_pull_request_review(
    idempotency_key: str = "123456",
    created_at: datetime = time_now(),
    actor_username: str = "abc",
) -> GitlabNote:

    return GitlabNote(
        {
            "id": idempotency_key,
            "created_at": created_at.strftime("%Y-%m-%dT%H:%M:%S.%f%z"),
            "author": {"username": actor_username},
        }
    )


def get_gitlab_commit(
    message: str = None,
    url: str = None,
    sha: str = "random_hash",
    author_login: str = "gitlab_author",
    created_at: datetime = time_now(),
) -> GitlabCommit:
    return GitlabCommit(
        {
            "message": message,
            "web_url": url,
            "id": sha,
            "author_email": author_login,
            "created_at": created_at.strftime("%Y-%m-%dT%H:%M:%S.%f%z"),
        }
    )
