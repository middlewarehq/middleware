from dora.store.models.code import OrgRepo, PullRequest
from dora.store.repos.code import CodeRepoService

from typing import List


class PullRequestAnalyticsService:
    def __init__(self, code_repo_service: CodeRepoService):
        self.code_repo_service: CodeRepoService = code_repo_service

    def get_prs_by_ids(self, pr_ids: List[str]) -> List[PullRequest]:
        return self.code_repo_service.get_prs_by_ids(pr_ids)

    def get_team_repos(self, team_id: str) -> List[OrgRepo]:
        return self._code_repo.get_team_repos(team_id)


def get_pr_analytics_service():
    return PullRequestAnalyticsService(CodeRepoService())
