from typing import List, Optional
from mhq.store.models.core.teams import Team
from mhq.store.repos.core import CoreRepoService


class TeamService:
    def __init__(self, core_repo_service: CoreRepoService):
        self._core_repo_service = core_repo_service

    def get_team(self, team_id: str) -> Optional[Team]:
        return self._core_repo_service.get_team(team_id)

    def delete_team(self, team_id: str) -> Optional[Team]:
        return self._core_repo_service.delete_team(team_id)

    def create_team(self, org_id: str, name: str, member_ids: List[str] = None) -> Team:
        return self._core_repo_service.create_team(org_id, name, member_ids or [])

    def update_team(
        self, team_id: str, name: str = None, member_ids: List[str] = None
    ) -> Team:

        team = self._core_repo_service.get_team(team_id)

        if name is not None:
            team.name = name

        if member_ids is not None:
            team.member_ids = member_ids

        return self._core_repo_service.update_team(team)


def get_team_service():
    return TeamService(CoreRepoService())
