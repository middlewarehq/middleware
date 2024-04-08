from typing import Optional

from sqlalchemy import and_

from dora.store import session, rollback_on_exc
from dora.store.models import UserIdentityProvider, Integration
from dora.store.models.core import Organization, Team, Users
from dora.utils.cryptography import get_crypto_service


class CoreRepoService:
    def __init__(self):
        self._crypto = get_crypto_service()

    @rollback_on_exc
    def get_org(self, org_id):
        return (
            session.query(Organization).filter(Organization.id == org_id).one_or_none()
        )

    @rollback_on_exc
    def get_team(self, team_id: str) -> Team:
        return (
            session.query(Team)
            .filter(Team.id == team_id, Team.is_deleted.is_(False))
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

    @rollback_on_exc
    def get_access_token(self, org_id, provider: UserIdentityProvider) -> Optional[str]:
        user_identity: Integration = (
            session.query(Integration)
            .filter(
                and_(Integration.org_id == org_id, Integration.name == provider.value)
            )
            .one_or_none()
        )

        if not user_identity:
            return None

        if user_identity.access_token_enc_chunks:
            return self._crypto.decrypt_chunks(user_identity.access_token_enc_chunks)

        return None
