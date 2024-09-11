from typing import Dict

from flask import Blueprint
from voluptuous import Required, Schema, Coerce, All, Optional
from werkzeug.exceptions import BadRequest

from mhq.api.request_utils import dataschema, queryschema, uuid_validator
from mhq.api.resources.settings_resource import adapt_configuration_settings_response
from mhq.service.query_validator import get_query_validator
from mhq.service.settings import get_settings_service, settings_type_validator
from mhq.store.models import SettingType, EntityType

app = Blueprint("settings", __name__)


@app.route("/teams/<team_id>/settings", methods={"GET"})
@queryschema(
    Schema(
        {
            Required("setting_type"): All(str, Coerce(settings_type_validator)),
            Optional("setter_id"): All(str, Coerce(uuid_validator)),
        }
    ),
)
def get_team_settings(team_id: str, setting_type: SettingType, setter_id: str = None):

    query_validator = get_query_validator()

    team = query_validator.team_validator(team_id)

    setter = None

    if setter_id:
        setter = query_validator.user_validator(setter_id)

    if setter and str(setter.org_id) != str(team.org_id):
        raise BadRequest(f"User {setter_id} does not belong to team {team_id}")

    settings_service = get_settings_service()
    settings = settings_service.get_settings(
        setting_type=setting_type,
        entity_type=EntityType.TEAM,
        entity_id=team_id,
    )

    if not settings:
        settings = settings_service.save_settings(
            setting_type=setting_type,
            entity_type=EntityType.TEAM,
            entity_id=team_id,
            setter=setter,
        )

    return adapt_configuration_settings_response(settings)


@app.route("/teams/<team_id>/settings", methods={"PUT"})
@dataschema(
    Schema(
        {
            Required("setting_type"): All(str, Coerce(settings_type_validator)),
            Optional("setter_id"): All(str, Coerce(uuid_validator)),
            Required("setting_data"): dict,
        }
    ),
)
def put_team_settings(
    team_id: str,
    setting_type: SettingType,
    setter_id: str = None,
    setting_data: Dict = None,
):

    query_validator = get_query_validator()

    team = query_validator.team_validator(team_id)

    setter = None

    if setter_id:
        setter = query_validator.user_validator(setter_id)

    if setter and str(setter.org_id) != str(team.org_id):
        raise BadRequest(f"User {setter_id} does not belong to team {team_id}")

    settings_service = get_settings_service()
    settings = settings_service.save_settings(
        setting_type=setting_type,
        entity_type=EntityType.TEAM,
        entity_id=team_id,
        setter=setter,
        setting_data=setting_data,
    )
    return adapt_configuration_settings_response(settings)


@app.route("/orgs/<org_id>/settings", methods={"GET"})
@queryschema(
    Schema(
        {
            Required("setting_type"): All(str, Coerce(settings_type_validator)),
            Optional("setter_id"): All(str, Coerce(uuid_validator)),
        }
    ),
)
def get_org_settings(org_id: str, setting_type: SettingType, setter_id: str = None):

    query_validator = get_query_validator()
    query_validator.org_validator(org_id)

    setter = None

    if setter_id:
        setter = query_validator.user_validator(setter_id)

    if setter and str(setter.org_id) != str(org_id):
        raise BadRequest(f"User {setter_id} does not belong to org {org_id}")

    settings_service = get_settings_service()
    settings = settings_service.get_settings(
        setting_type=setting_type,
        entity_type=EntityType.ORG,
        entity_id=org_id,
    )

    if not settings:
        settings = settings_service.save_settings(
            setting_type=setting_type,
            entity_type=EntityType.ORG,
            entity_id=org_id,
            setter=setter,
        )

    return adapt_configuration_settings_response(settings)


@app.route("/orgs/<org_id>/settings", methods={"PUT"})
@dataschema(
    Schema(
        {
            Required("setting_type"): All(str, Coerce(settings_type_validator)),
            Optional("setter_id"): All(str, Coerce(uuid_validator)),
            Required("setting_data"): dict,
        }
    ),
)
def put_org_settings(
    org_id: str,
    setting_type: SettingType,
    setter_id: str = None,
    setting_data: Dict = None,
):
    query_validator = get_query_validator()
    query_validator.org_validator(org_id)

    setter = None

    if setter_id:
        setter = query_validator.user_validator(setter_id)

    if setter and str(setter.org_id) != str(org_id):
        raise BadRequest(f"User {setter_id} does not belong to org {org_id}")

    settings_service = get_settings_service()
    settings = settings_service.save_settings(
        setting_type=setting_type,
        entity_type=EntityType.ORG,
        entity_id=org_id,
        setter=setter,
        setting_data=setting_data,
    )
    return adapt_configuration_settings_response(settings)
