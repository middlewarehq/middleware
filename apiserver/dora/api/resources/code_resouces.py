from typing import Dict
from dora.store.models.code import PullRequest
from dora.store.models.core import Users


def adapt_user_info(
    author: str,
    username_user_map: Dict[str, Users] = None,
):
    if not username_user_map or author not in username_user_map:
        return {"username": author, "linked_user": None}

    return {
        "username": author,
        "linked_user": {
            "id": str(username_user_map[author].id),
            "name": username_user_map[author].name,
            "email": username_user_map[author].primary_email,
            "avatar_url": username_user_map[author].avatar_url,
        },
    }


def adapt_pull_request(
    pr: PullRequest,
    username_user_map: Dict[str, Users] = None,
) -> Dict[str, any]:
    username_user_map = username_user_map or {}
    pr_data = {
        "id": str(pr.id),
        "repo_id": str(pr.repo_id),
        "number": pr.number,
        "title": pr.title,
        "state": pr.state.value,
        "author": adapt_user_info(pr.author, username_user_map),
        "reviewers": [
            adapt_user_info(r, username_user_map) for r in (pr.reviewers or [])
        ],
        "pr_link": pr.url,
        "base_branch": pr.base_branch,
        "head_branch": pr.head_branch,
        "created_at": pr.created_at.isoformat(),
        "updated_at": pr.updated_at.isoformat(),
        "state_changed_at": pr.state_changed_at.isoformat()
        if pr.state_changed_at
        else None,
        "commits": pr.commits,
        "additions": pr.additions,
        "deletions": pr.deletions,
        "changed_files": pr.changed_files,
        "comments": pr.comments,
        "provider": pr.provider,
        "first_commit_to_open": pr.first_commit_to_open,
        "first_response_time": pr.first_response_time,
        "rework_time": pr.rework_time,
        "merge_time": pr.merge_time,
        "merge_to_deploy": pr.merge_to_deploy,
        "cycle_time": pr.cycle_time,
        "lead_time": pr.lead_time,
        "rework_cycles": pr.rework_cycles,
    }

    return pr_data
