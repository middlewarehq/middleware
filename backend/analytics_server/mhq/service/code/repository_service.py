from typing import List
from mhq.store.models.code import OrgRepo
from mhq.store.models.core import Team
from mhq.store.repos.code import CodeRepoService


class RepositoryService:
    def __init__(self, code_repo_service: CodeRepoService):
        self._code_repo_service = code_repo_service

    def get_team_repos(self, team: Team) -> List[OrgRepo]:
        return self._code_repo_service.get_team_repos(team_id=str(team.id))


def get_repository_service():
    return RepositoryService(CodeRepoService())
