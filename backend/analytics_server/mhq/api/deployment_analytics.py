from werkzeug.exceptions import NotFound
from collections import defaultdict
from typing import Dict, List
from datetime import datetime
import json

from flask import Blueprint
from voluptuous import Required, Schema, Coerce, All, Optional
from mhq.api.resources.code_resouces import get_non_paginated_pr_response
from mhq.service.deployments.deployments_factory_service import (
    DeploymentsFactoryService,
)
from mhq.service.deployments.factory import get_deployments_factory
from mhq.service.pr_analytics import get_pr_analytics_service
from mhq.service.code.pr_filter import apply_pr_filter

from mhq.api.request_utils import coerce_workflow_filter, queryschema
from mhq.api.resources.deployment_resources import (
    adapt_deployment,
    adapt_deployment_frequency_metrics,
)
from mhq.service.deployments.analytics import get_deployment_analytics_service
from mhq.service.query_validator import get_query_validator
from mhq.store.models import SettingType, EntityType, Team
from mhq.store.models.code.filter import PRFilter
from mhq.store.models.code.pull_requests import PullRequest
from mhq.store.models.code.repository import OrgRepo, TeamRepos
from mhq.store.models.code.workflows.filter import WorkflowFilter
from mhq.service.deployments.models.models import (
    Deployment,
    DeploymentFrequencyMetrics,
    DeploymentType,
)
from mhq.store.repos.code import CodeRepoService


app = Blueprint("deployment_analytics", __name__)


@app.route("/teams/<team_id>/deployment_analytics", methods={"GET"})
@queryschema(
    Schema(
        {
            Required("from_time"): All(str, Coerce(datetime.fromisoformat)),
            Required("to_time"): All(str, Coerce(datetime.fromisoformat)),
            Optional("pr_filter"): All(str, Coerce(json.loads)),
            Optional("workflow_filter"): All(str, Coerce(coerce_workflow_filter)),
        }
    ),
)
def get_team_deployment_analytics(
    team_id: str,
    from_time: datetime,
    to_time: datetime,
    pr_filter: Dict = None,
    workflow_filter: WorkflowFilter = None,
):
    query_validator = get_query_validator()
    interval = query_validator.interval_validator(from_time, to_time)
    query_validator.team_validator(team_id)

    pr_filter: PRFilter = apply_pr_filter(
        pr_filter, EntityType.TEAM, team_id, [SettingType.EXCLUDED_PRS_SETTING]
    )
    code_repo_service = CodeRepoService()

    team_repos: List[TeamRepos] = code_repo_service.get_active_team_repos_by_team_id(
        team_id
    )
    org_repos: List[OrgRepo] = code_repo_service.get_active_org_repos_by_ids(
        [str(team_repo.org_repo_id) for team_repo in team_repos]
    )

    deployments_analytics_service = get_deployment_analytics_service()

    repo_id_to_deployments_map_with_prs: Dict[
        str, List[Dict[Deployment, List[PullRequest]]]
    ] = deployments_analytics_service.get_team_successful_deployments_in_interval_with_related_prs(
        team_id, interval, pr_filter, workflow_filter
    )

    repo_id_deployments_map = defaultdict(list)

    for repo_id, deployment_to_prs_map in repo_id_to_deployments_map_with_prs.items():
        adapted_deployments = []
        for deployment, prs in deployment_to_prs_map.items():
            adapted_deployment = adapt_deployment(deployment)
            adapted_deployment["pr_count"] = len(prs)

            adapted_deployments.append(adapted_deployment)

        repo_id_deployments_map[repo_id] = adapted_deployments

    return {
        "deployments_map": repo_id_deployments_map,
        "repos_map": {
            str(repo.id): {
                "id": str(repo.id),
                "name": repo.name,
                "language": repo.language,
                "default_branch": repo.default_branch,
                "parent": repo.org_name,
            }
            for repo in org_repos
        },
    }


@app.route("/deployments/<deployment_id>/prs", methods={"GET"})
def get_prs_included_in_deployment(deployment_id: str):
    pr_analytics_service = get_pr_analytics_service()
    deployment_type: DeploymentType

    (
        deployment_type,
        entity_id,
    ) = DeploymentsFactoryService.get_deployment_type_and_entity_id_from_deployment_id(
        deployment_id
    )

    deployments_service: DeploymentsFactoryService = get_deployments_factory(
        deployment_type
    )
    deployment: Deployment = deployments_service.get_deployment_by_entity_id(entity_id)
    if not deployment:
        raise NotFound(f"Deployment not found for id {deployment_id}")

    repo: OrgRepo = pr_analytics_service.get_repo_by_id(deployment.repo_id)

    prs: List[
        PullRequest
    ] = deployments_service.get_pull_requests_related_to_deployment(deployment)
    repo_id_map = {repo.id: repo}

    return get_non_paginated_pr_response(
        prs=prs, repo_id_map=repo_id_map, total_count=len(prs)
    )


@app.route("/teams/<team_id>/deployment_frequency", methods={"GET"})
@queryschema(
    Schema(
        {
            Required("from_time"): All(str, Coerce(datetime.fromisoformat)),
            Required("to_time"): All(str, Coerce(datetime.fromisoformat)),
            Optional("pr_filter"): All(str, Coerce(json.loads)),
            Optional("workflow_filter"): All(str, Coerce(coerce_workflow_filter)),
        }
    ),
)
def get_team_deployment_frequency(
    team_id: str,
    from_time: datetime,
    to_time: datetime,
    pr_filter: Dict = None,
    workflow_filter: WorkflowFilter = None,
):

    query_validator = get_query_validator()
    interval = query_validator.interval_validator(from_time, to_time)
    query_validator.team_validator(team_id)

    pr_filter: PRFilter = apply_pr_filter(
        pr_filter, EntityType.TEAM, team_id, [SettingType.EXCLUDED_PRS_SETTING]
    )

    deployments_analytics_service = get_deployment_analytics_service()

    team_deployment_frequency_metrics: DeploymentFrequencyMetrics = (
        deployments_analytics_service.get_team_deployment_frequency_metrics(
            team_id, interval, pr_filter, workflow_filter
        )
    )

    return adapt_deployment_frequency_metrics(team_deployment_frequency_metrics)


@app.route("/teams/<team_id>/deployment_frequency/trends", methods={"GET"})
@queryschema(
    Schema(
        {
            Required("from_time"): All(str, Coerce(datetime.fromisoformat)),
            Required("to_time"): All(str, Coerce(datetime.fromisoformat)),
            Optional("pr_filter"): All(str, Coerce(json.loads)),
            Optional("workflow_filter"): All(str, Coerce(coerce_workflow_filter)),
        }
    ),
)
def get_team_deployment_frequency_trends(
    team_id: str,
    from_time: datetime,
    to_time: datetime,
    pr_filter: Dict = None,
    workflow_filter: WorkflowFilter = None,
):

    query_validator = get_query_validator()
    interval = query_validator.interval_validator(from_time, to_time)
    query_validator.team_validator(team_id)

    pr_filter: PRFilter = apply_pr_filter(
        pr_filter, EntityType.TEAM, team_id, [SettingType.EXCLUDED_PRS_SETTING]
    )

    deployments_analytics_service = get_deployment_analytics_service()

    week_to_deployments_count_map: Dict[
        datetime, int
    ] = deployments_analytics_service.get_weekly_deployment_frequency_trends(
        team_id, interval, pr_filter, workflow_filter
    )

    return {
        week.isoformat(): {"count": deployment_count}
        for week, deployment_count in week_to_deployments_count_map.items()
    }
