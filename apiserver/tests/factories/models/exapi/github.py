from dataclasses import dataclass
from datetime import datetime
from typing import Dict

from dora.utils.time import time_now


def get_github_commit_dict(
    sha: str = "123456789098765",
    author_login: str = "author_abc",
    url: str = "https://github.com/123456789098765",
    message: str = "[abc 315] avoid mapping edit state",
    created_at: str = "2022-06-29T10:53:15Z",
) -> Dict:
    return {
        "sha": sha,
        "commit": {
            "committer": {"name": "abc", "email": "abc@midd.com", "date": created_at},
            "message": message,
        },
        "author": {
            "login": author_login,
            "id": 95607047,
            "node_id": "abc",
            "avatar_url": "",
        },
        "html_url": url,
    }


@dataclass
class GithubPullRequestReview:
    id: str
    submitted_at: datetime
    user_login: str

    @property
    def raw_data(self):
        return {
            "id": self.id,
            "submitted_at": self.submitted_at,
            "user": {
                "login": self.user_login,
            },
        }


def get_github_pull_request_review(
    review_id: str = "123456",
    submitted_at: datetime = time_now(),
    user_login: str = "abc",
) -> GithubPullRequestReview:

    return GithubPullRequestReview(review_id, submitted_at, user_login)
