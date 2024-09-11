from typing import Optional, List

from sqlalchemy import and_

from mhq.store import db, rollback_on_exc
from mhq.store.models import UserIdentityProvider, Integration
from mhq.store.models.core import Organization, Team, Users
from mhq.utils.cryptography import get_crypto_service


class CoreRepoService:
    def __init__(self):
        self._crypto = get_crypto_service()
        self._db = db

    @rollback_on_exc
    def get_org(self, org_id):
        return (
            self._db.session.query(Organization)
            .filter(Organization.id == org_id)
            .one_or_none()
        )

    @rollback_on_exc
    def get_org_by_name(self, org_name: str):
        return (
            self._db.session.query(Organization)
            .filter(Organization.name == org_name)
            .one_or_none()
        )

    @rollback_on_exc
    def get_team(self, team_id: str) -> Team:
        return (
            self._db.session.query(Team)
            .filter(Team.id == team_id, Team.is_deleted.is_(False))
            .one_or_none()
        )

    @rollback_on_exc
    def delete_team(self, team_id: str):

        team = self._db.session.query(Team).filter(Team.id == team_id).one_or_none()

        if not team:
            return None

        team.is_deleted = True

        self._db.session.merge(team)
        self._db.session.commit()
        return self._db.session.query(Team).filter(Team.id == team_id).one_or_none()

    @rollback_on_exc
    def create_team(self, org_id: str, name: str, member_ids: List[str]) -> Team:
        team = Team(
            name=name,
            org_id=org_id,
            member_ids=member_ids or [],
            is_deleted=False,
        )
        self._db.session.add(team)
        self._db.session.commit()

        return self.get_team(team.id)

    @rollback_on_exc
    def update_team(self, team: Team) -> Team:
        self._db.session.merge(team)
        self._db.session.commit()

        return self.get_team(team.id)

    @rollback_on_exc
    def get_user(self, user_id) -> Optional[Users]:
        return self._db.session.query(Users).filter(Users.id == user_id).one_or_none()

    @rollback_on_exc
    def get_users(self, user_ids: List[str]) -> List[Users]:
        return (
            self._db.session.query(Users)
            .filter(
                and_(Users.id.in_(user_ids), Users.is_deleted == False)  # noqa E712
            )
            .all()
        )

    @rollback_on_exc
    def get_org_integrations_for_names(self, org_id: str, provider_names: List[str]):
        return (
            self._db.session.query(Integration)
            .filter(
                and_(Integration.org_id == org_id, Integration.name.in_(provider_names))
            )
            .all()
        )

    @rollback_on_exc
    def get_access_token(self, org_id, provider: UserIdentityProvider) -> Optional[str]:
        user_identity: Integration = (
            self._db.session.query(Integration)
            .filter(
                and_(Integration.org_id == org_id, Integration.name == provider.value)
            )
            .one_or_none()
        )

        if not user_identity or not user_identity.access_token_enc_chunks:
            return None
        return self._crypto.decrypt_chunks(user_identity.access_token_enc_chunks)
