from typing import Dict, List
from mhq.service.code.models.lead_time import LeadTimeMetrics
from mhq.api.resources.core_resources import adapt_user_info
from mhq.store.models.code import PullRequest, OrgRepo, TeamRepos
from mhq.store.models.core import Users


def _get_lead_time_for_pr(pr: PullRequest) -> int:
    return (
        (
            pr.first_commit_to_open
            if pr.first_commit_to_open is not None and pr.first_commit_to_open > 0
            else 0
        )
        + pr.cycle_time
        + pr.merge_to_deploy
    )


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
        "url": pr.url,
        "base_branch": pr.base_branch,
        "head_branch": pr.head_branch,
        "created_at": pr.created_at.isoformat(),
        "updated_at": pr.updated_at.isoformat(),
        "state_changed_at": (
            pr.state_changed_at.isoformat() if pr.state_changed_at else None
        ),
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
        "lead_time": _get_lead_time_for_pr(pr),
        "rework_cycles": pr.rework_cycles,
    }

    return pr_data


def get_non_paginated_pr_response(
    prs: List[PullRequest],
    repo_id_map: dict,
    total_count: int,
    username_user_map: dict = None,
):
    username_user_map = username_user_map or {}
    return {
        "data": [
            {
                "id": str(pr.id),
                "number": pr.number,
                "title": pr.title,
                "state": pr.state.value,
                "first_commit_to_open": pr.first_commit_to_open,
                "merge_to_deploy": pr.merge_to_deploy,
                "first_response_time": pr.first_response_time,
                "rework_time": pr.rework_time,
                "merge_time": pr.merge_time,
                "cycle_time": pr.cycle_time,
                "lead_time": _get_lead_time_for_pr(pr),
                "author": adapt_user_info(pr.author, username_user_map),
                "reviewers": [
                    adapt_user_info(r, username_user_map) for r in (pr.reviewers or [])
                ],
                "repo_name": repo_id_map[pr.repo_id].name,
                "pr_link": pr.url,
                "base_branch": pr.base_branch,
                "head_branch": pr.head_branch,
                "created_at": pr.created_at.isoformat(),
                "updated_at": pr.updated_at.isoformat(),
                "state_changed_at": (
                    pr.state_changed_at.isoformat() if pr.state_changed_at else None
                ),
                "commits": pr.commits,
                "additions": pr.additions,
                "deletions": pr.deletions,
                "changed_files": pr.changed_files,
                "comments": pr.comments,
                "provider": pr.provider,
                "rework_cycles": pr.rework_cycles,
            }
            for pr in prs
        ],
        "total_count": total_count,
    }


def adapt_lead_time_metrics(lead_time_metric: LeadTimeMetrics) -> Dict[str, any]:
    return {
        "lead_time": lead_time_metric.lead_time,
        "first_commit_to_open": lead_time_metric.first_commit_to_open,
        "first_response_time": lead_time_metric.first_response_time,
        "rework_time": lead_time_metric.rework_time,
        "merge_time": lead_time_metric.merge_time,
        "merge_to_deploy": lead_time_metric.merge_to_deploy,
        "pr_count": lead_time_metric.pr_count,
    }


def adapt_org_repo(org_repo: OrgRepo) -> Dict[str, any]:
    return {
        "id": str(org_repo.id),
        "org_id": str(org_repo.org_id),
        "name": org_repo.name,
        "org_name": org_repo.org_name,
        "provider": org_repo.provider,
        "is_active": org_repo.is_active,
        "default_branch": org_repo.default_branch,
        "language": org_repo.language,
        "contributors": org_repo.contributors,
        "idempotency_key": org_repo.idempotency_key,
        "slug": org_repo.slug,
        "created_at": org_repo.created_at.isoformat(),
        "updated_at": org_repo.updated_at.isoformat(),
    }


def adapt_team_repos(team_repos: List[TeamRepos]) -> List[Dict[str, any]]:
    return [
        {
            "team_id": str(team_repo.team_id),
            "org_repo_id": str(team_repo.org_repo_id),
            "prod_branches": team_repo.prod_branches,
            "is_active": team_repo.is_active,
            "created_at": team_repo.created_at.isoformat(),
            "updated_at": team_repo.updated_at.isoformat(),
        }
        for team_repo in team_repos
    ]
