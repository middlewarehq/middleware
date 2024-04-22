from flask import Blueprint
from typing import List
from voluptuous import Required, Schema, Optional
from mhq.api.resources.code_resouces import adapt_org_repo
from mhq.service.code.repository_service import get_repository_service
from mhq.api.resources.core_resources import adapt_team
from mhq.store.models.core.teams import Team
from mhq.service.core.teams import get_team_service

from mhq.api.request_utils import dataschema
from mhq.service.query_validator import get_query_validator

app = Blueprint("teams", __name__)


@app.route("/team/<team_id>", methods={"GET"})
def fetch_team(team_id):

    query_validator = get_query_validator()
    team: Team = query_validator.team_validator(team_id)

    return adapt_team(team)


@app.route("/team/<team_id>", methods={"PATCH"})
@dataschema(
    Schema(
        {
            Optional("name"): str,
            Optional("member_ids"): list,
        }
    ),
)
def update_team_patch(team_id: str, name: str = None, member_ids: List[str] = None):

    query_validator = get_query_validator()
    team: Team = query_validator.team_validator(team_id)

    if member_ids:
        query_validator.users_validator(member_ids)

    team_service = get_team_service()

    team: Team = team_service.update_team(team_id, name, member_ids)

    return adapt_team(team)


@app.route("/org/<org_id>/team", methods={"POST"})
@dataschema(
    Schema(
        {
            Required("name"): str,
            Required("member_ids"): list,
        }
    ),
)
def create_team(org_id: str, name: str, member_ids: List[str]):

    query_validator = get_query_validator()
    query_validator.org_validator(org_id)
    query_validator.users_validator(member_ids)

    team_service = get_team_service()

    team: Team = team_service.create_team(org_id, name, member_ids)

    return adapt_team(team)


@app.route("/team/<team_id>", methods={"DELETE"})
def delete_team(team_id: str):

    query_validator = get_query_validator()
    team: Team = query_validator.team_validator(team_id)

    team_service = get_team_service()

    team = team_service.delete_team(team_id)

    return adapt_team(team)


@app.route("/teams/<team_id>/repos", methods={"GET"})
def fetch_team_repos(team_id: str):

    query_validator = get_query_validator()
    team: Team = query_validator.team_validator(team_id)

    team_repos = get_repository_service().get_team_repos(team)

    return [adapt_org_repo(repo) for repo in team_repos]
