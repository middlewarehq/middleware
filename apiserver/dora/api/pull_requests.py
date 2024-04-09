import json
from datetime import datetime

from flask import Blueprint
from typing import Dict, List

from voluptuous import Required, Schema, Coerce, All, Optional
from dora.service.code.lead_time import get_lead_time_service
from dora.service.code.pr_filter import apply_pr_filter

from dora.store.models.code import PRFilter
from dora.store.models.core import Team
from dora.service.query_validator import get_query_validator

from dora.api.request_utils import queryschema
from dora.api.resources.code_resouces import (
    adapt_pull_request,
    get_non_paginated_pr_response,
)
from dora.store.models.code.pull_requests import PullRequest
from dora.service.pr_analytics import get_pr_analytics_service
from dora.service.settings.models import ExcludedPRsSetting

from dora.utils.time import Interval


from dora.service.settings.configuration_settings import get_settings_service

from dora.store.models import SettingType, EntityType


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
