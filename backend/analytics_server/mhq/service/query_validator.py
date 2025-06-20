from datetime import timedelta
from typing import List

from werkzeug.exceptions import NotFound, BadRequest
from mhq.exceptions.webhook import InvalidApiKeyError

from mhq.store.models.core import Organization, Team, Users
from mhq.store.repos.core import CoreRepoService
from mhq.store.models import UserIdentityProvider
from mhq.utils.time import Interval

DEFAULT_ORG_NAME = "default"


class QueryValidator:
    def __init__(self, repo_service: CoreRepoService):
        self.repo_service = repo_service

    def get_default_org(self) -> Organization:
        org: Organization = self.repo_service.get_org_by_name(DEFAULT_ORG_NAME)
        if org is None:
            raise NotFound("Default org not found")
        return org

    def org_validator(self, org_id: str) -> Organization:
        org: Organization = self.repo_service.get_org(org_id)
        if org is None:
            raise NotFound(f"Org {org_id} not found")
        return org

    def team_validator(self, team_id: str) -> Team:
        team: Team = self.repo_service.get_team(team_id)
        if team is None:
            raise NotFound(f"Team {team_id} not found")
        return team

    def teams_validator(self, team_ids: List[str]) -> List[Team]:
        teams: List[Team] = self.repo_service.get_teams(team_ids)
        if len(teams) != len(team_ids):
            query_team_ids = set(team_ids)
            found_team_ids = set(map(lambda x: str(x.id), teams))
            missing_team_ids = query_team_ids - found_team_ids
            raise NotFound(f"Team(s) not found: {missing_team_ids}")
        return teams

    def interval_validator(
        self, from_time, to_time, interval_limit_in_days: int = 105
    ) -> Interval:
        if None in (from_time.tzinfo, to_time.tzinfo):
            raise BadRequest("Timestamp passed without tz info")
        interval = Interval(from_time, to_time)
        if interval_limit_in_days is not None and interval.duration > timedelta(
            days=interval_limit_in_days
        ):
            raise BadRequest(
                f"Only {interval_limit_in_days} days duration is supported"
            )
        return interval

    def user_validator(self, user_id: str) -> Users:
        user = self.repo_service.get_user(user_id)
        if user is None:
            raise NotFound(f"User {user_id} not found")
        return user

    def users_validator(self, user_ids: List[str]) -> List[Users]:
        users: List[Users] = self.repo_service.get_users(user_ids)

        if len(users) != len(user_ids):
            query_user_ids = set(user_ids)
            found_user_ids = set(map(lambda x: str(x.id), users))
            missing_user_ids = query_user_ids - found_user_ids
            raise NotFound(f"User(s) not found: {missing_user_ids}")

        return users

    def api_key_validator(self, secret_key: str | None, org_id: str) -> str:
        api_key = self.repo_service.get_access_token(
            org_id, UserIdentityProvider.WEBHOOK
        )

        if not api_key or api_key != secret_key:
            raise InvalidApiKeyError()

        return api_key


def get_query_validator():
    return QueryValidator(CoreRepoService())
