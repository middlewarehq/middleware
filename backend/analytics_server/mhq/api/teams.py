from flask import Blueprint
from typing import Any, Dict, List
from voluptuous import Required, Schema, Optional, All, Coerce
from werkzeug.exceptions import BadRequest
from mhq.store.models.code.repository import OrgRepo, TeamRepos
from mhq.service.code.models.org_repo import RawTeamOrgRepo
from mhq.api.resources.code_resouces import (
    adapt_team_repos,
    adapt_team_repo_and_org_repo,
)
from mhq.service.code.repository_service import get_repository_service
from mhq.api.resources.core_resources import adapt_team
from mhq.store.models.core.teams import Team
from mhq.service.core.teams import get_team_service

from mhq.api.request_utils import coerce_org_repos, coerce_team_repos, dataschema
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

    team_repos_service = get_repository_service()
    team_org_repos: List[OrgRepo] = team_repos_service.get_team_repos(team)
    team_repos: List[TeamRepos] = team_repos_service.get_team_repos_by_team(team)
    team_id_team_repos_map: Dict[str, TeamRepos] = {
        str(repo.org_repo_id): repo for repo in team_repos
    }

    return [
        adapt_team_repo_and_org_repo(repo, team_id_team_repos_map.get(str(repo.id)))
        for repo in team_org_repos
    ]


@app.route("/teams/<team_id>/repos", methods={"PUT"})
@dataschema(
    Schema(
        {
            Required("repos"): All(list, Coerce(coerce_org_repos)),
        }
    ),
)
def update_team_repos(team_id: str, repos: List[RawTeamOrgRepo]):

    query_validator = get_query_validator()
    team: Team = query_validator.team_validator(team_id)

    repository_service = get_repository_service()
    updated_org_repos = repository_service.update_team_repos(team, repos)
    repo_id_team_repos_map: Dict[str, TeamRepos] = (
        repository_service.get_repo_id_team_repos_map(team, updated_org_repos)
    )

    adapted_repos: List[Dict[str, Any]] = []
    for repo in updated_org_repos:
        team_repo = repo_id_team_repos_map[str(repo.id)]
        adapted_repo = adapt_team_repo_and_org_repo(repo, team_repo)
        adapted_repos.append(adapted_repo)

    return adapted_repos


@app.route("/teams/<team_id>/team_repos", methods={"PATCH"})
@dataschema(
    Schema(
        {
            Required("team_repos_data"): All(list, Coerce(coerce_team_repos)),
        }
    ),
)
def patch_team_repos_mapping(team_id: str, team_repos_data: List[TeamRepos]):

    query_validator = get_query_validator()
    team = query_validator.team_validator(team_id)

    for team_repo in team_repos_data:
        if team_repo.team_id != team_id:
            raise BadRequest(
                f"Team Repo with repo_id: {team_repo.org_repo_id} team_id: {team_repo.team_id} does not match team in request url: {team_id}."  # noqa E501
            )

    team_repos_service = get_repository_service()
    team_repos = team_repos_service.patch_team_repos_mapping(team, team_repos_data)
    return adapt_team_repos(team_repos)
