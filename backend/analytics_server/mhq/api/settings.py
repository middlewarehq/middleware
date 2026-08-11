from typing import Dict

from flask import Blueprint
from voluptuous import Required, Schema, Coerce, All, Optional
from werkzeug.exceptions import BadRequest

from mhq.api.request_utils import dataschema, queryschema, uuid_validator
from mhq.api.resources.settings_resource import adapt_configuration_settings_response
from mhq.service.query_validator import get_query_validator
from mhq.service.settings import get_settings_service, settings_type_validator
from mhq.service.settings.benchmarks import (
    GLOBAL_BENCHMARK_ENTITY_ID,
    empty_benchmark_settings,
    get_resolved_benchmarks_for_team,
    validate_benchmark_payload,
)
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
        # CLUSTOX: benchmarks opt out of the auto-create below. Every other
        # setting type has a meaningful shipped default and relies on this
        # row being written on first read; a benchmark has no default that is
        # safe to invent, because writing one at TEAM scope silently ends
        # that team's per-metric inheritance from the global baseline and
        # makes the card claim "your team's benchmark" for a target the team
        # never set. Gated on the setting type rather than removed, so
        # INCIDENT_SETTING, EXCLUDED_PRS_SETTING and the rest are untouched.
        if setting_type == SettingType.BENCHMARK_SETTING:
            settings = empty_benchmark_settings(EntityType.TEAM, team_id)
        else:
            settings = settings_service.save_settings(
                setting_type=setting_type,
                entity_type=EntityType.TEAM,
                entity_id=team_id,
                setter=setter,
            )

    return adapt_configuration_settings_response(settings)


# CLUSTOX: the resolved benchmarks for a team -- the team row falling back to
# the global baseline, per metric, with the source of each.
#
# This exists because the four DORA cards read the targets out of
# `metrics_summary.benchmarks`, which is written only by the dora_metrics BFF
# route. The resolved values used to be attached to
# /teams/<id>/deployment_analytics, whose response lands in a different redux
# slice that no card reads, so the entire user-visible half of the feature
# rendered nothing. Serving them here lets the dora_metrics BFF fold them into
# the response the cards actually consume, inside the Promise.all it already
# runs, without adding a round trip to the page.
@app.route("/teams/<team_id>/benchmarks", methods={"GET"})
def get_team_benchmarks(team_id: str):

    query_validator = get_query_validator()
    query_validator.team_validator(team_id)

    return get_resolved_benchmarks_for_team(team_id)


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

    # CLUSTOX: this is the route every workspace admin's benchmark form
    # writes to, and it used to store setting_data verbatim -- a lead_time of
    # -1, a change_failure_rate of 5000, or a typo'd `leadtime` key that
    # _adapt_benchmark_setting_from_json drops on the floor while the admin
    # gets a success toast. The client-side mirror in BenchmarkSettingsForm is
    # not a trust boundary. Validation also normalises the payload to all four
    # keys, which is what makes clearing a field mean "inherit" rather than
    # "write the defaults" (see validate_benchmark_payload).
    if setting_type == SettingType.BENCHMARK_SETTING:
        setting_data = validate_benchmark_payload(setting_data)

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


# CLUSTOX: GLOBAL scope exists for exactly one setting type. These routes are
# reachable by anything holding the internal token, and every other setting
# type is meaningless without an entity to scope it to -- an unguarded
# setting_type would let a caller create a GLOBAL row under the benchmark
# sentinel id for, say, EXCLUDED_PRS_SETTING, and would run the benchmark
# validator's unknown-keys check against a payload it knows nothing about,
# rejecting it with a confusing message. Reject it plainly instead.
def _assert_global_scope_is_benchmarks(setting_type: SettingType):
    if setting_type != SettingType.BENCHMARK_SETTING:
        raise BadRequest(
            f"Global scope is only supported for "
            f"{SettingType.BENCHMARK_SETTING.value}, got {setting_type.value}"
        )


# CLUSTOX: the superadmin's baseline belongs to no team and no workspace, so
# it cannot use the team- or org-scoped routes above. Authorisation is enforced
# at the BFF -- this layer only knows the internal token, not who is calling.
@app.route("/settings/global", methods={"GET"})
@queryschema(
    Schema(
        {
            Required("setting_type"): All(str, Coerce(settings_type_validator)),
        }
    ),
)
def get_global_settings(setting_type: SettingType):

    _assert_global_scope_is_benchmarks(setting_type)

    settings_service = get_settings_service()
    settings = settings_service.get_settings(
        setting_type=setting_type,
        entity_type=EntityType.GLOBAL,
        entity_id=GLOBAL_BENCHMARK_ENTITY_ID,
    )

    # CLUSTOX: read-only. Creating the row here meant a single admin opening a
    # single team form (which fetches this to build its placeholders)
    # materialised the installation-wide baseline, so "no benchmark anywhere"
    # -- the state the spec requires every card to render unchanged in -- was
    # unreachable in practice. A superadmin creates the row by saving one.
    if not settings:
        settings = empty_benchmark_settings(
            EntityType.GLOBAL, GLOBAL_BENCHMARK_ENTITY_ID
        )

    return adapt_configuration_settings_response(settings)


@app.route("/settings/global", methods={"PUT"})
@dataschema(
    Schema(
        {
            Required("setting_type"): All(str, Coerce(settings_type_validator)),
            Required("setting_data"): dict,
        }
    ),
)
def put_global_settings(setting_type: SettingType, setting_data: Dict = None):

    _assert_global_scope_is_benchmarks(setting_type)

    setting_data = validate_benchmark_payload(setting_data)

    settings_service = get_settings_service()
    settings = settings_service.save_settings(
        setting_type=setting_type,
        entity_type=EntityType.GLOBAL,
        entity_id=GLOBAL_BENCHMARK_ENTITY_ID,
        setting_data=setting_data,
    )
    return adapt_configuration_settings_response(settings)
