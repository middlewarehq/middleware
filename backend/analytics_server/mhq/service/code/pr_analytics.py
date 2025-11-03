from mhq.store.models.code.filter import PRFilter
from mhq.store.models.core.teams import Team
from mhq.utils.time import Interval
from mhq.store.models.code import OrgRepo, PullRequest
from mhq.store.repos.code import CodeRepoService
from typing import List, Optional


class PullRequestAnalyticsService:
    def __init__(self, code_repo_service: CodeRepoService):
        self.code_repo_service: CodeRepoService = code_repo_service

    def get_prs_by_ids(self, pr_ids: List[str]) -> List[PullRequest]:
        return self.code_repo_service.get_prs_by_ids(pr_ids)

    def get_team_repos(self, team_id: str) -> List[OrgRepo]:
        return self.code_repo_service.get_team_repos(team_id)

    def get_repo_by_id(self, repo_id: str) -> Optional[OrgRepo]:
        return self.code_repo_service.get_repo_by_id(repo_id)

    def get_prs_merged_without_review(self, repo_ids: List[str], interval: Interval, pr_filter: PRFilter) -> List[PullRequest]:
        return self.code_repo_service.get_prs_merged_without_review(repo_ids, interval, pr_filter)

def get_pr_analytics_service():
    return PullRequestAnalyticsService(CodeRepoService())
