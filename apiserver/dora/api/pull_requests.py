from flask import Blueprint
from typing import List

from dora.api.resources.code_resouces import adapt_pull_request
from dora.store.models.code.pull_requests import PullRequest
from dora.service.pr_analytics import get_pr_analytics_service
from dora.service.settings.models import ExcludedPRsSetting


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
