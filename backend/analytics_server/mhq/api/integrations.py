from typing import List
from flask import Blueprint, jsonify
from github import GithubException

# CLUSTOX: Required is used by the Jenkins mapping request schemas below.
from voluptuous import Schema, Optional, Required, Coerce, Range, All

from mhq.exapi.models.gitlab import GitlabRepo

# CLUSTOX: the Jenkins mapping routes take a JSON body rather than query
# params, and resolve repos and workflow rows directly -- hence dataschema,
# uuid_validator, the RepoWorkflow model and the two repo services.
from mhq.api.request_utils import dataschema, queryschema, uuid_validator
from mhq.service.external_integrations_service import get_external_integrations_service
from mhq.service.query_validator import get_query_validator
from mhq.store.models import UserIdentityProvider
from mhq.store.models.code import RepoWorkflowProviders, RepoWorkflowType
from mhq.store.models.code.workflows.workflows import RepoWorkflow
from mhq.store.repos.code import CodeRepoService
from mhq.store.repos.workflows import WorkflowRepoService

# END CLUSTOX
from mhq.utils.github import github_org_data_multi_thread_worker

app = Blueprint("integrations", __name__)

STATUS_TOO_MANY_REQUESTS = 429


# CLUSTOX: key under RepoWorkflow.meta on the Jenkins row, holding the ids of
# the deployment workflows that this mapping switched off. Written on mapping,
# read on unmapping. Without it an unmapping has no way to tell a workflow it
# displaced from one that was already inactive for an unrelated reason.
DISPLACED_WORKFLOW_IDS_KEY = "jenkins_displaced_workflow_ids"


# CLUSTOX: JSONB columns on this model default to the string "{}" rather than a
# dict, and a row written before DISPLACED_WORKFLOW_IDS_KEY existed has no
# record at all. Both read as "displaced nothing".
def _workflow_meta(workflow) -> dict:
    meta = getattr(workflow, "meta", None)
    return meta if isinstance(meta, dict) else {}


# CLUSTOX: one active deployment source per repo, whatever the provider. A repo
# tracked through both GitHub Actions and Jenkins -- or through two Jenkins jobs,
# which is two clicks away if an admin maps the wrong job and then the right one
# -- would count every deploy twice, doubling Deployment Frequency with nothing
# visibly wrong. Deactivation is reversible: the rows survive, and
# reactivate_github_actions_workflows_for_repo restores them when the Jenkins
# mapping is removed. Returns the rows it actually switched off, because those
# -- and only those -- are what the unmapping has to switch back on.
def deactivate_deployment_workflows_for_repo(workflows: List) -> List:
    deactivated = []
    for workflow in workflows:
        if workflow.is_active:
            workflow.is_active = False
            deactivated.append(workflow)
    return deactivated


# CLUSTOX: the other half of the invariant above. docs/JENKINS_INTEGRATION.md and
# the mapping dialog both promise the admin can undo a mapping, which means the
# GitHub Actions rows the mapping switched off have to come back on.
#
# Restricted to displaced_workflow_ids, which is the whole point. Mapping only
# ever deactivates *active* rows, but a repo can hold inactive GitHub Actions
# deployment workflows that Jenkins never touched: teams/v2.ts deactivates all
# of a repo's deployment workflows and re-enables only the ones the admin
# selected, so every deselected workflow sits there inactive. Reactivating
# every inactive row -- as this did -- turns a repo with one selected and four
# deselected workflows into a repo with five active ones after a single
# map/unmap round trip, inflating Deployment Frequency through the GitHub path
# instead of the Jenkins one.
def reactivate_github_actions_workflows_for_repo(
    workflows: List, displaced_workflow_ids: List[str]
) -> List:
    displaced = {str(workflow_id) for workflow_id in displaced_workflow_ids or []}
    reactivated = []
    for workflow in workflows:
        if (
            workflow.provider == RepoWorkflowProviders.GITHUB_ACTIONS
            and not workflow.is_active
            and str(workflow.id) in displaced
        ):
            workflow.is_active = True
            reactivated.append(workflow)
    return reactivated


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
def get_org_repos(org_id: str, org_login: str, page_size: int, page: int):
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


@app.route("/orgs/<org_id>/integrations/github/user/repos", methods={"GET"})
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
def get_user_repos(org_id: str, page_size: int, page: int):
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
        return external_integrations_service.get_github_personal_repos(
            page_size, page - 1
        )
    except GithubException as e:
        return jsonify(e.data), e.status


@app.route(
    "/orgs/<org_id>/integrations/github/<gh_org_name>/<gh_org_repo_name>/workflows",
    methods={"GET"},
)
def get_workflows_for_repo(org_id: str, gh_org_name: str, gh_org_repo_name: str):
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


@app.route("/orgs/<org_id>/integrations/gitlab/groups", methods={"GET"})
def get_gitlab_orgs(org_id: str):
    query_validator = get_query_validator()
    query_validator.org_validator(org_id)

    try:
        external_integrations_service = get_external_integrations_service(
            org_id, UserIdentityProvider.GITLAB
        )
        groups = external_integrations_service.get_gitlab_groups()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return {
        "orgs": [
            {
                "login": group.get("path"),
                "name": group.get("name"),
                "avatar_url": group.get("avatar_url"),
                "web_url": group.get("web_url"),
                "provider_org_id": group.get("id"),
            }
            for group in groups
        ]
    }


@app.route(
    "/orgs/<org_id>/integrations/gitlab/groups/<group_id>/repos", methods={"GET"}
)
@queryschema(
    Schema(
        {
            Optional("page_size", default="20"): All(
                str, Coerce(int), Range(min=1, max=100)
            ),
            Optional("page", default="1"): All(str, Coerce(int), Range(min=1)),
        }
    ),
)
def get_gitlab_projects(org_id: str, group_id: str, page_size: int, page: int):
    query_validator = get_query_validator()
    query_validator.org_validator(org_id)

    try:
        external_integrations_service = get_external_integrations_service(
            org_id, UserIdentityProvider.GITLAB
        )
        projects: List[GitlabRepo] = (
            external_integrations_service.get_gitlab_group_projects(
                group_id, page_size, page
            )
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return [
        {
            "name": project.name,
            "org_name": project.org_name,
            "default_branch": project.default_branch,
            "idempotency_key": project.idempotency_key,
            "slug": project.slug,
            "description": project.description,
            "web_url": project.web_url,
        }
        for project in projects
    ]


@app.route("/orgs/<org_id>/integrations/jenkins/jobs", methods={"GET"})
def get_jenkins_jobs(org_id: str):
    # CLUSTOX: Jenkins-specific imports stay local to the handler, mirroring
    # the lazy-import precedent for provider modules in
    # mhq/service/workflows/sync/etl_jenkins_handler.py.
    import requests

    from mhq.exapi.jenkins import JenkinsApiService
    from mhq.store.repos.core import CoreRepoService
    from mhq.utils.jenkins import get_jenkins_config

    query_validator = get_query_validator()
    query_validator.org_validator(org_id)

    api_token = CoreRepoService().get_access_token(org_id, UserIdentityProvider.JENKINS)
    base_url, username = get_jenkins_config(org_id)
    if not (api_token and base_url and username):
        return {"error": "Jenkins is not configured for this workspace"}, 400

    try:
        return JenkinsApiService(base_url, username, api_token).get_jobs()
    except requests.RequestException as e:
        # An unreachable, slow or erroring Jenkins is not a bug in this server.
        # Surfaced as a 500 it reached the setup form as "check your
        # credentials", which sends the admin looking in the wrong place.
        return (
            jsonify({"error": f"Could not reach Jenkins: {str(e)}"}),
            502,
        )


# CLUSTOX: maps a Jenkins job to a repo as its deployment source. Enforces the
# one-active-deployment-source-per-repo invariant and reuses the row for an
# already-known (org_repo_id, provider_workflow_id) pair.
@app.route("/orgs/<org_id>/integrations/jenkins/mappings", methods={"POST"})
@dataschema(
    Schema(
        {
            Required("org_repo_id"): All(str, Coerce(uuid_validator)),
            Required("job_full_name"): str,
        }
    ),
)
def create_jenkins_mapping(org_id: str, org_repo_id: str, job_full_name: str):
    query_validator = get_query_validator()
    query_validator.org_validator(org_id)

    org_repo = CodeRepoService().get_repo_by_id(org_repo_id)
    if org_repo is None or str(org_repo.org_id) != str(org_id):
        return jsonify({"error": f"Repo {org_repo_id} not found in org {org_id}"}), 404

    workflow_repo_service = WorkflowRepoService()

    # A row may already exist for this (org_repo_id, provider_workflow_id) --
    # left behind inactive by a previous unmapping. The pair is uniquely
    # indexed, so inserting a second one raises IntegrityError; reuse it.
    existing_workflow = (
        workflow_repo_service.get_repo_workflow_by_repo_id_and_provider_workflow_id(
            org_repo_id, job_full_name
        )
    )
    # The lookup matches the index, which is not scoped by provider, so the row
    # occupying this pair may belong to another provider -- a Jenkins job whose
    # full name happens to equal a GitHub Actions workflow id. Reusing it would
    # silently convert someone else's deployment workflow into a Jenkins
    # mapping, taking its runs and its history with it. Refuse instead: an
    # admin who sees this can rename the job, and one who does not would never
    # have found the takeover.
    if (
        existing_workflow is not None
        and existing_workflow.provider != RepoWorkflowProviders.JENKINS
    ):
        return (
            jsonify(
                {
                    "error": (
                        f"Repo {org_repo_id} already has a "
                        f"{existing_workflow.provider.value} workflow with the "
                        f"id {job_full_name}"
                    )
                }
            ),
            409,
        )
    existing_jenkins_workflow = existing_workflow

    active_workflows = workflow_repo_service.get_repo_workflow_by_repo_ids(
        [org_repo_id], RepoWorkflowType.DEPLOYMENT
    )
    # Every active deployment workflow on this repo except the one being mapped,
    # regardless of provider: an already-active Jenkins job for a different
    # pipeline has to go too, or the repo ends up with two live sources.
    workflows_to_deactivate = [
        workflow
        for workflow in active_workflows
        if existing_jenkins_workflow is None
        or str(workflow.id) != str(existing_jenkins_workflow.id)
    ]
    # Mutates the rows in place; the actual write happens together with the
    # Jenkins row below, in one commit.
    deactivated = deactivate_deployment_workflows_for_repo(workflows_to_deactivate)

    if existing_jenkins_workflow is not None:
        existing_jenkins_workflow.is_active = True
        existing_jenkins_workflow.name = job_full_name
        jenkins_workflow = existing_jenkins_workflow
    else:
        jenkins_workflow = RepoWorkflow(
            org_repo_id=org_repo_id,
            type=RepoWorkflowType.DEPLOYMENT,
            provider=RepoWorkflowProviders.JENKINS,
            provider_workflow_id=job_full_name,
            is_active=True,
            name=job_full_name,
        )
    # CLUSTOX: the record of what this mapping displaced. Replaced rather than
    # merged: a remapping recomputes the set from scratch, and anything left
    # over from a previous mapping was already restored when that one was
    # removed. A new dict, not a mutation, so SQLAlchemy sees the change.
    jenkins_workflow.meta = {
        **_workflow_meta(jenkins_workflow),
        DISPLACED_WORKFLOW_IDS_KEY: [str(workflow.id) for workflow in deactivated],
    }
    workflow_repo_service.create_jenkins_repo_workflow(
        jenkins_workflow, workflows_to_deactivate
    )

    return {"ok": True, "deactivated_workflows": len(deactivated)}


# CLUSTOX: removes a Jenkins mapping and restores the GitHub Actions workflows
# the mapping displaced. Jenkins rows only -- see the provider check below.
@app.route("/orgs/<org_id>/integrations/jenkins/mappings", methods={"DELETE"})
@dataschema(
    Schema(
        {
            Required("repo_workflow_id"): All(str, Coerce(uuid_validator)),
        }
    ),
)
def delete_jenkins_mapping(org_id: str, repo_workflow_id: str):
    query_validator = get_query_validator()
    query_validator.org_validator(org_id)

    workflow_repo_service = WorkflowRepoService()
    repo_workflow = workflow_repo_service.get_repo_workflow_by_id(repo_workflow_id)
    if repo_workflow is None:
        return jsonify({"error": f"Workflow {repo_workflow_id} not found"}), 404

    org_repo = CodeRepoService().get_repo_by_id(repo_workflow.org_repo_id)
    if org_repo is None or str(org_repo.org_id) != str(org_id):
        return (
            jsonify(
                {"error": f"Workflow {repo_workflow_id} not found in org {org_id}"}
            ),
            404,
        )

    # get_repo_workflow_by_id is not filtered by provider, so without this an
    # admin could pass any workflow id from their own workspace and silently
    # disable a GitHub Actions deployment workflow through the Jenkins route.
    if repo_workflow.provider != RepoWorkflowProviders.JENKINS:
        return (
            jsonify({"error": f"Jenkins mapping {repo_workflow_id} not found"}),
            404,
        )

    # Removing the mapping gives the repo its deployment source back, which is
    # what both the docs and the mapping dialog promise -- but only the rows
    # the mapping itself displaced. A mapping written before this record
    # existed restores nothing, which is the safe direction: a repo with no
    # active deployment source reads as zero deployments, a repo with several
    # reads as several times too many, and only the second one is silent.
    meta = _workflow_meta(repo_workflow)
    github_workflows = workflow_repo_service.get_repo_workflows_by_repo_id_and_provider(
        str(repo_workflow.org_repo_id),
        RepoWorkflowProviders.GITHUB_ACTIONS,
        RepoWorkflowType.DEPLOYMENT,
    )
    reactivated = reactivate_github_actions_workflows_for_repo(
        github_workflows, meta.get(DISPLACED_WORKFLOW_IDS_KEY)
    )
    # Drop the record in the same commit that acts on it, so a second unmapping
    # -- or one that follows a team-config edit that deselected these same
    # workflows -- does not restore them a second time.
    repo_workflow.meta = {
        key: value for key, value in meta.items() if key != DISPLACED_WORKFLOW_IDS_KEY
    }
    workflow_repo_service.deactivate_repo_workflow(repo_workflow, reactivated)

    return {"ok": True, "reactivated_github_workflows": len(reactivated)}


@app.route("/orgs/<org_id>/integrations/gitlab/user/repos", methods={"GET"})
@queryschema(
    Schema(
        {
            Optional("page_size", default="20"): All(
                str, Coerce(int), Range(min=1, max=100)
            ),
            Optional("page", default="1"): All(str, Coerce(int), Range(min=1)),
        }
    ),
)
def get_gitlab_user_projects(org_id: str, page_size: int, page: int):
    query_validator = get_query_validator()
    query_validator.org_validator(org_id)

    try:
        external_integrations_service = get_external_integrations_service(
            org_id, UserIdentityProvider.GITLAB
        )
        projects: List[GitlabRepo] = (
            external_integrations_service.get_gitlab_user_projects(page_size, page)
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return [
        {
            "name": project.name,
            "org_name": project.org_name,
            "default_branch": project.default_branch,
            "idempotency_key": project.idempotency_key,
            "slug": project.slug,
            "description": project.description,
            "web_url": project.web_url,
        }
        for project in projects
    ]
