from flask import Blueprint, jsonify
from github import GithubException
from voluptuous import Schema, Optional, Coerce, Range, All, Required

from mhq.api.request_utils import queryschema
from mhq.service.external_integrations_service import get_external_integrations_service
from mhq.service.query_validator import get_query_validator
from mhq.store.models import UserIdentityProvider
from mhq.utils.github import github_org_data_multi_thread_worker

app = Blueprint("integrations", __name__)

STATUS_TOO_MANY_REQUESTS = 429


@app.route("/orgs/<org_id>/integrations/github/orgs", methods={"GET"})
def get_github_orgs(org_id: str):
    query_validator = get_query_validator()
    query_validator.org_validator(org_id)

    try:
        external_integrations_service = get_external_integrations_service(
            org_id, UserIdentityProvider.GITHUB
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    try:
        orgs = external_integrations_service.get_github_organizations()
    except GithubException as e:
        return jsonify(e.data), e.status
    org_data_map = github_org_data_multi_thread_worker(orgs)
    return {
        "orgs": [
            {
                "login": o.login,
                "avatar_url": o.avatar_url,
                "web_url": o.html_url,
                "repos": org_data_map.get(o.name, {}).get("repos", []),
                "members": [],
            }
            for o in orgs
        ]
    }


@app.route("/orgs/<org_id>/integrations/github/orgs/<org_login>/repos", methods={"GET"})
@queryschema(
    Schema(
        {
            Optional("page_size", default="30"): All(
                str, Coerce(int), Range(min=1, max=100)
            ),
            Optional("page", default="1"): All(str, Coerce(int), Range(min=1)),
        }
    ),
)
def get_repos(org_id: str, org_login: str, page_size: int, page: int):
    query_validator = get_query_validator()
    query_validator.org_validator(org_id)

    try:
        external_integrations_service = get_external_integrations_service(
            org_id, UserIdentityProvider.GITHUB
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    # GitHub pages start from 0 and Bitbucket pages start from 1.
    # Need to be consistent, hence making standard as page starting from 1
    # and passing a decremented value to GitHub
    try:
        return external_integrations_service.get_github_org_repos(
            org_login, page_size, page - 1
        )
    except GithubException as e:
        return jsonify(e.data), e.status


@app.route(
    "/orgs/<org_id>/integrations/github/<gh_org_name>/<gh_org_repo_name>/workflows",
    methods={"GET"},
)
def get_prs_for_repo(org_id: str, gh_org_name: str, gh_org_repo_name: str):
    query_validator = get_query_validator()
    query_validator.org_validator(org_id)

    try:
        external_integrations_service = get_external_integrations_service(
            org_id, UserIdentityProvider.GITHUB
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    try:
        workflows_list = external_integrations_service.get_repo_workflows(
            gh_org_name, gh_org_repo_name
        )
    except GithubException as e:
        return jsonify(e.data), e.status

    return [
        {
            "id": github_workflow.id,
            "name": github_workflow.name,
            "html_url": github_workflow.html_url,
        }
        for github_workflow in workflows_list
    ]
