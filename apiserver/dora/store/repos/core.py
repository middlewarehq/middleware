from typing import Optional

from dora.store import session, rollback_on_exc
from dora.store.models.core import Organization, Team, Users


class CoreRepoService:
    @rollback_on_exc
    def get_org(self, org_id):
        return (
            session.query(Organization).filter(Organization.id == org_id).one_or_none()
        )

    @rollback_on_exc
    def get_team(self, team_id: str) -> Team:
        return (
            session.query(Team)
            .filter(Team.id == team_id, Team.is_deleted == False)
            .one_or_none()
        )

    @rollback_on_exc
    def delete_team(self, team_id: str):

        team = session.query(Team).filter(Team.id == team_id).one_or_none()

        if not team:
            return None

        team.is_deleted = True

        session.merge(team)
        session.commit()
        return session.query(Team).filter(Team.id == team_id).one_or_none()

    @rollback_on_exc
    def get_user(self, user_id) -> Optional[Users]:
        return session.query(Users).filter(Users.id == user_id).one_or_none()
