from typing import List
from datetime import timedelta
from werkzeug.exceptions import NotFound, BadRequest
from dora.store.models.core import Organization, Team, Users

from dora.store.repos.core import CoreRepoService
from dora.utils.time import Interval


class QueryValidator:
    def __init__(self, repo_service: CoreRepoService):
        self.repo_service = repo_service

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


def get_query_validator():
    return QueryValidator(CoreRepoService())
