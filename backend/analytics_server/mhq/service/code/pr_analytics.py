from mhq.store.models.code import OrgRepo, PullRequest
from mhq.store.repos.code import CodeRepoService


from typing import List,Optional
from mhq.utils.time import Interval


class PullRequestAnalyticsService:
    def __init__(self, code_repo_service: CodeRepoService):
        self.code_repo_service: CodeRepoService = code_repo_service

    def get_prs_by_ids(self, pr_ids: List[str]) -> List[PullRequest]:
        return self.code_repo_service.get_prs_by_ids(pr_ids)
    
    def get_prs_merged_without_review(self,team_id:str,interval:Interval) -> List[PullRequest]:
        return self.code_repo_service.get_prs_merged_without_review(team_id,interval)

    def get_team_repos(self, team_id: str) -> List[OrgRepo]:
        return self.code_repo_service.get_team_repos(team_id)

    def get_repo_by_id(self, repo_id: str) -> Optional[OrgRepo]:
        return self.code_repo_service.get_repo_by_id(repo_id)


def get_pr_analytics_service():
    return PullRequestAnalyticsService(CodeRepoService())
