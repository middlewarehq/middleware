from flask import Blueprint
from werkzeug.exceptions import BadRequest, NotFound
from typing import Dict, List

from voluptuous import Required, Schema, Coerce, All

from dora.api.request_utils import dataschema, queryschema, uuid_validator
from dora.api.resources.settings_resource import adapt_configuration_settings_response

from dora.service.query_validator import get_query_validator
from dora.service.settings.configuration_settings import get_settings_service
from dora.store.models import Organization, Users
from dora.store.models import SettingType, EntityType
from dora.service.settings.setting_type_validator import settings_type_validator


app = Blueprint("settings", __name__)


@app.route("/teams/<team_id>/settings", methods={"GET"})
@queryschema(
    Schema(
        {
            Required("setting_type"): All(str, Coerce(settings_type_validator)),
            Required("setter_id"): All(str, Coerce(uuid_validator)),
        }
    ),
)
def get_team_settings(team_id: str, setting_type: SettingType, setter_id: str):

    query_validator = get_query_validator()

    team = query_validator.team_validator(team_id)
    setter = query_validator.user_validator(setter_id)

    if str(setter.org_id) != str(team.org_id):
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
            Required("setter_id"): All(str, Coerce(uuid_validator)),
            Required("setting_data"): dict,
        }
    ),
)
def put_team_settings(
    team_id: str, setting_type: SettingType, setter_id: str, setting_data: Dict = None
):

    query_validator = get_query_validator()

    team = query_validator.team_validator(team_id)
    setter = query_validator.user_validator(setter_id)

    if str(setter.org_id) != str(team.org_id):
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


@app.route("/users/<user_id>/settings", methods={"GET"})
@queryschema(
    Schema(
        {
            Required("setting_type"): All(str, Coerce(settings_type_validator)),
            Required("setter_id"): All(str, Coerce(uuid_validator)),
        }
    ),
)
def get_user_settings(user_id: str, setting_type: SettingType, setter_id: str):
    query_validator = get_query_validator()

    user = query_validator.user_validator(user_id)
    setter = query_validator.user_validator(setter_id)

    if str(setter.org_id) != str(user.org_id):
        raise BadRequest(f"User {setter_id} does not belong to org {str(user.org_id)}")

    settings_service = get_settings_service()
    settings = settings_service.get_settings(
        setting_type=setting_type,
        entity_type=EntityType.USER,
        entity_id=user_id,
    )

    if not settings:
        settings = settings_service.save_settings(
            setting_type=setting_type,
            entity_type=EntityType.USER,
            entity_id=user_id,
            setter=setter,
        )

    return adapt_configuration_settings_response(settings)


@app.route("/users/<user_id>/settings", methods={"PUT"})
@dataschema(
    Schema(
        {
            Required("setting_type"): All(str, Coerce(settings_type_validator)),
            Required("setter_id"): All(str, Coerce(uuid_validator)),
            Required("setting_data"): dict,
        }
    ),
)
def put_user_settings(
    user_id: str, setting_type: SettingType, setter_id: str, setting_data: Dict = None
):
    query_validator = get_query_validator()

    user = query_validator.user_validator(user_id)
    setter = query_validator.user_validator(setter_id)

    if not setter:
        raise NotFound(f"User not found for user_id {setter_id}")
    if str(setter.org_id) != str(user.org_id):
        raise BadRequest(f"User {setter_id} does not belong to org {str(user.org_id)}")

    settings_service = get_settings_service()
    settings = settings_service.save_settings(
        setting_type=setting_type,
        entity_type=EntityType.USER,
        entity_id=user_id,
        setter=setter,
        setting_data=setting_data,
    )
    return adapt_configuration_settings_response(settings)


@app.route("/orgs/<org_id>/settings", methods={"GET"})
@queryschema(
    Schema(
        {
            Required("setting_type"): All(str, Coerce(settings_type_validator)),
            Required("setter_id"): All(str, Coerce(uuid_validator)),
        }
    ),
)
def get_org_settings(org_id: str, setting_type: SettingType, setter_id: str):

    query_validator = get_query_validator()
    org: Organization = query_validator.org_validator(org_id)
    setter: Users = query_validator.user_validator(setter_id)

    if str(setter.org_id) != str(org_id):
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
            Required("setter_id"): All(str, Coerce(uuid_validator)),
            Required("setting_data"): dict,
        }
    ),
)
def put_org_settings(
    org_id: str, setting_type: SettingType, setter_id: str, setting_data: Dict = None
):
    query_validator = get_query_validator()
    org: Organization = query_validator.org_validator(org_id)
    setter: Users = query_validator.user_validator(setter_id)

    if str(setter.org_id) != str(org_id):
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
