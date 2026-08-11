# CLUSTOX: no typing.Optional here on purpose -- voluptuous.Optional is imported
# below and shadows it, and an annotation that reads Optional[...] resolves to
# voluptuous's marker class, which is not subscriptable. Under Python 3.9,
# where annotations are evaluated at def time, that is a TypeError on import of
# this module, taking every route in it down. Default arguments say "optional"
# here instead.
from typing import Dict, List, Tuple
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
from mhq.store.models.code.enums import TeamReposDeploymentType
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

# CLUSTOX: second key on the same blob, holding the TeamRepos.deployment_type
# values this mapping overwrote, keyed by team id. Mapping a job is useless
# without the switch it records: DeploymentsService splits a team's repos on
# that column and only consults RepoWorkflowRuns for the WORKFLOW side, so a
# repo left on PR_MERGE ingests Jenkins builds and counts none of them --
# mapping appears to work, changes nothing, and reports no error. Recorded for
# the same reason the displaced workflow ids are: unmapping has to put back
# exactly what mapping changed, and "everything is PR_MERGE now" would demote a
# repo the admin had deliberately configured as WORKFLOW.
PREVIOUS_DEPLOYMENT_TYPES_KEY = "jenkins_previous_deployment_types"


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


# CLUSTOX: points every team that tracks this repo at its workflow runs, which
# is what actually makes a Jenkins build count as a deployment. Returns the rows
# it changed together with the values it overwrote; rows already on WORKFLOW are
# neither changed nor recorded, so unmapping leaves them alone rather than
# demoting a repo the admin configured that way himself.
def switch_team_repos_to_workflow_deployments(
    team_repos: List,
) -> Tuple[List, Dict[str, str]]:
    switched = []
    previous_deployment_types: Dict[str, str] = {}
    for team_repo in team_repos:
        if team_repo.deployment_type == TeamReposDeploymentType.WORKFLOW:
            continue
        # A null deployment_type is recorded as PR_MERGE -- the column default,
        # and the only value that restores to something DeploymentsService can
        # read, since it dereferences .value without a null check.
        previous_deployment_types[str(team_repo.team_id)] = (
            team_repo.deployment_type.value
            if team_repo.deployment_type
            else TeamReposDeploymentType.PR_MERGE.value
        )
        team_repo.deployment_type = TeamReposDeploymentType.WORKFLOW
        switched.append(team_repo)
    return switched, previous_deployment_types


# CLUSTOX: the other half of the switch above, and the same restraint as
# reactivate_github_actions_workflows_for_repo: restore only the rows this
# mapping recorded, and only while they still hold the value the mapping wrote.
# A row the admin has since changed by hand is his decision, not ours to undo.
def restore_team_repo_deployment_types(
    team_repos: List, previous_deployment_types: Dict[str, str] = None
) -> List:
    recorded = previous_deployment_types or {}
    restored = []
    for team_repo in team_repos:
        previous = recorded.get(str(team_repo.team_id))
        if not previous:
            continue
        if team_repo.deployment_type != TeamReposDeploymentType.WORKFLOW:
            continue
        team_repo.deployment_type = TeamReposDeploymentType(previous)
        restored.append(team_repo)
    return restored


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


# CLUSTOX: the workspace's live Jenkins mappings. Without this the mapping table
# reloads showing "Select a Jenkins job" for a repo that is mapped and ingesting
# deployments -- an admin's configuration looks lost -- and nothing can supply
# the repo_workflow_id the DELETE route needs, so a mapping cannot be undone
# from the UI at all.
@app.route("/orgs/<org_id>/integrations/jenkins/mappings", methods={"GET"})
def get_jenkins_mappings(org_id: str):
    query_validator = get_query_validator()
    query_validator.org_validator(org_id)

    # Active Jenkins deployment workflows only: an inactive row is a mapping the
    # admin removed, and offering it back would misreport where a repo's
    # deployments come from. Scoping is the OrgRepo join inside the query.
    mappings = WorkflowRepoService().get_active_repo_workflows_by_org_id_and_provider(
        org_id, RepoWorkflowProviders.JENKINS, RepoWorkflowType.DEPLOYMENT
    )

    return [
        {
            "repo_workflow_id": str(repo_workflow.id),
            "org_repo_id": str(repo_workflow.org_repo_id),
            "job_full_name": repo_workflow.provider_workflow_id,
            "repo_name": org_repo.name,
        }
        for repo_workflow, org_repo in mappings
    ]


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

    code_repo_service = CodeRepoService()
    org_repo = code_repo_service.get_repo_by_id(org_repo_id)
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

    # Mutated in place like the workflows above, and written in the same commit.
    team_repos = code_repo_service.get_active_team_repos_by_repo_id(org_repo_id)
    switched_team_repos, previous_deployment_types = (
        switch_team_repos_to_workflow_deployments(team_repos)
    )
    # A Jenkins mapping this one displaces already switched these rows, so this
    # mapping records nothing for them and the values it is overwriting sit on
    # the displaced row's meta. Carrying them forward is what keeps the last
    # unmapping in a chain of remappings able to restore the repo; dropping them
    # strands it on WORKFLOW with no workflow behind it -- zero deployments,
    # silently.
    for workflow in deactivated:
        if workflow.provider != RepoWorkflowProviders.JENKINS:
            continue
        carried = _workflow_meta(workflow).get(PREVIOUS_DEPLOYMENT_TYPES_KEY) or {}
        for team_id, deployment_type in carried.items():
            previous_deployment_types.setdefault(team_id, deployment_type)

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
        PREVIOUS_DEPLOYMENT_TYPES_KEY: previous_deployment_types,
    }
    workflow_repo_service.create_jenkins_repo_workflow(
        jenkins_workflow, workflows_to_deactivate, switched_team_repos
    )

    return {
        "ok": True,
        "deactivated_workflows": len(deactivated),
        "switched_team_repos": len(switched_team_repos),
    }


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

    code_repo_service = CodeRepoService()
    org_repo = code_repo_service.get_repo_by_id(repo_workflow.org_repo_id)
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
    # The deployment_type switch is undone on the same terms: only the team rows
    # this mapping recorded. A repo already on WORKFLOW when it was mapped was
    # never recorded, so it stays on WORKFLOW here.
    team_repos = code_repo_service.get_active_team_repos_by_repo_id(
        str(repo_workflow.org_repo_id)
    )
    restored_team_repos = restore_team_repo_deployment_types(
        team_repos, meta.get(PREVIOUS_DEPLOYMENT_TYPES_KEY)
    )
    # Drop the record in the same commit that acts on it, so a second unmapping
    # -- or one that follows a team-config edit that deselected these same
    # workflows -- does not restore them a second time.
    dropped_keys = {DISPLACED_WORKFLOW_IDS_KEY, PREVIOUS_DEPLOYMENT_TYPES_KEY}
    repo_workflow.meta = {
        key: value for key, value in meta.items() if key not in dropped_keys
    }
    workflow_repo_service.deactivate_repo_workflow(
        repo_workflow, reactivated, restored_team_repos
    )

    return {
        "ok": True,
        "reactivated_github_workflows": len(reactivated),
        "restored_team_repos": len(restored_team_repos),
    }


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
