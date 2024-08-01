import json
from datetime import datetime

from flask import Blueprint
from typing import Dict, List

from voluptuous import Required, Schema, Coerce, All, Optional
from mhq.service.code.models.lead_time import LeadTimeMetrics
from mhq.service.code.lead_time import get_lead_time_service
from mhq.service.code.pr_filter import apply_pr_filter

from mhq.store.models.code import PRFilter
from mhq.store.models.core import Team
from mhq.service.query_validator import get_query_validator

from mhq.api.request_utils import queryschema
from mhq.api.resources.code_resouces import (
    adapt_lead_time_metrics,
    adapt_pull_request,
    get_non_paginated_pr_response,
)
from mhq.store.models.code.pull_requests import PullRequest
from mhq.service.code.pr_analytics import get_pr_analytics_service
from mhq.service.settings.models import ExcludedPRsSetting

from mhq.utils.time import Interval


from mhq.service.settings.configuration_settings import get_settings_service

from mhq.store.models import SettingType, EntityType


app = Blueprint("pull_requests", __name__)


@app.route("/teams/<team_id>/prs/excluded", methods={"GET"})
def get_team_excluded_prs(team_id: str):

    settings = get_settings_service().get_settings(
        setting_type=SettingType.EXCLUDED_PRS_SETTING,
        entity_id=team_id,
        entity_type=EntityType.TEAM,
    )

    if not settings:
        return []

    excluded_pr_setting: ExcludedPRsSetting = settings.specific_settings

    excluded_pr_ids = excluded_pr_setting.excluded_pr_ids

    pr_analytics_service = get_pr_analytics_service()

    prs: List[PullRequest] = pr_analytics_service.get_prs_by_ids(excluded_pr_ids)

    return [adapt_pull_request(pr) for pr in prs]


@app.route("/teams/<team_id>/lead_time/prs", methods={"GET"})
@queryschema(
    Schema(
        {
            Required("from_time"): All(str, Coerce(datetime.fromisoformat)),
            Required("to_time"): All(str, Coerce(datetime.fromisoformat)),
            Optional("pr_filter"): All(str, Coerce(json.loads)),
        }
    ),
)
def get_lead_time_prs(
    team_id: str,
    from_time: datetime,
    to_time: datetime,
    pr_filter: Dict = None,
):

    query_validator = get_query_validator()

    interval: Interval = query_validator.interval_validator(from_time, to_time)
    team: Team = query_validator.team_validator(team_id)

    pr_filter: PRFilter = apply_pr_filter(
        pr_filter, EntityType.TEAM, team_id, [SettingType.EXCLUDED_PRS_SETTING]
    )

    lead_time_service = get_lead_time_service()
    pr_analytics = get_pr_analytics_service()

    repos = pr_analytics.get_team_repos(team_id)

    prs = lead_time_service.get_team_lead_time_prs(team, interval, pr_filter)

    repo_id_repo_map = {repo.id: repo for repo in repos}
    return get_non_paginated_pr_response(prs, repo_id_repo_map, len(prs))


@app.route("/teams/<team_id>/lead_time", methods={"GET"})
@queryschema(
    Schema(
        {
            Required("from_time"): All(str, Coerce(datetime.fromisoformat)),
            Required("to_time"): All(str, Coerce(datetime.fromisoformat)),
            Optional("pr_filter"): All(str, Coerce(json.loads)),
        }
    ),
)
def get_team_lead_time(
    team_id: str,
    from_time: datetime,
    to_time: datetime,
    pr_filter: Dict = None,
):

    query_validator = get_query_validator()

    interval: Interval = query_validator.interval_validator(from_time, to_time)
    team: Team = query_validator.team_validator(team_id)

    pr_filter: PRFilter = apply_pr_filter(
        pr_filter, EntityType.TEAM, team_id, [SettingType.EXCLUDED_PRS_SETTING]
    )

    lead_time_service = get_lead_time_service()

    teams_average_lead_time_metrics = lead_time_service.get_team_lead_time_metrics(
        team, interval, pr_filter
    )

    adapted_lead_time_metrics = adapt_lead_time_metrics(teams_average_lead_time_metrics)

    return adapted_lead_time_metrics


@app.route("/teams/<team_id>/lead_time/trends", methods={"GET"})
@queryschema(
    Schema(
        {
            Required("from_time"): All(str, Coerce(datetime.fromisoformat)),
            Required("to_time"): All(str, Coerce(datetime.fromisoformat)),
            Optional("pr_filter"): All(str, Coerce(json.loads)),
        }
    ),
)
def get_team_lead_time_trends(
    team_id: str,
    from_time: datetime,
    to_time: datetime,
    pr_filter: Dict = None,
):

    query_validator = get_query_validator()

    interval: Interval = query_validator.interval_validator(from_time, to_time)
    team: Team = query_validator.team_validator(team_id)

    pr_filter: PRFilter = apply_pr_filter(
        pr_filter, EntityType.TEAM, team_id, [SettingType.EXCLUDED_PRS_SETTING]
    )

    lead_time_service = get_lead_time_service()

    weekly_lead_time_metrics_avg_map: Dict[datetime, LeadTimeMetrics] = (
        lead_time_service.get_team_lead_time_metrics_trends(team, interval, pr_filter)
    )

    return {
        week.isoformat(): adapt_lead_time_metrics(average_lead_time_metrics)
        for week, average_lead_time_metrics in weekly_lead_time_metrics_avg_map.items()
    }

@app.route("/teams/<team_id>/prs/merged_not_reviwed", methods={"GET"})
def merge_not_reviwed(team_id : str):
    query_validator = get_query_validator()
    team: Team = query_validator.team_validator(team_id)
    pr_analytics = get_pr_analytics_service()
    result = pr_analytics.get_prs_not_reviewed_merged(team.id)
    return result
    # return {'message':'hellothere'}
    