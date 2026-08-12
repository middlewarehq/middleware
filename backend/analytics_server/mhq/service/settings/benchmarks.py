# CLUSTOX: benchmark resolution and validation.
#
# Resolution lives in the backend rather than the browser for three reasons:
# every consumer would otherwise reimplement the fallback and eventually
# disagree; the response can report WHICH benchmark applied, so an admin who
# thinks they set a target can see that they did not; and a fifth metric later
# is one more key here rather than one more reimplementation.
from datetime import datetime
from typing import Dict, List, Optional

from werkzeug.exceptions import BadRequest

from mhq.service.settings.models import BenchmarkSetting, ConfigurationSettings
from mhq.store.models.settings.enums import EntityType
from mhq.utils.time import time_now

# The global baseline belongs to no team and no workspace, but Settings.
# entity_id is NOT NULL. A fixed sentinel is the documented cost of reusing
# that table instead of adding one.
GLOBAL_BENCHMARK_ENTITY_ID = "00000000-0000-4000-8000-000000000001"

BENCHMARK_METRICS: List[str] = [
    "lead_time",
    "deployment_frequency",
    "change_failure_rate",
    "mean_time_to_recovery",
    "lines_of_code",
]

# Percent, so it has an upper bound the others do not.
_BOUNDED_METRICS = {"change_failure_rate": 100}


def resolve_benchmarks(
    team_setting: Optional[BenchmarkSetting],
    global_setting: Optional[BenchmarkSetting],
) -> Dict[str, Dict]:
    resolved = {}

    for metric in BENCHMARK_METRICS:
        team_value = getattr(team_setting, metric, None) if team_setting else None
        global_value = getattr(global_setting, metric, None) if global_setting else None

        # `is not None` rather than truthiness: 0 is a deliberate target.
        if team_value is not None:
            resolved[metric] = {"target": team_value, "source": "team"}
        elif global_value is not None:
            resolved[metric] = {"target": global_value, "source": "global"}
        else:
            resolved[metric] = {"target": None, "source": None}

    return resolved


def validate_benchmark_payload(data: Dict) -> Dict:
    unknown = set(data.keys()) - set(BENCHMARK_METRICS)
    if unknown:
        raise BadRequest(f"Unknown benchmark metrics: {', '.join(sorted(unknown))}")

    cleaned = {}
    for metric, value in data.items():
        if value is None:
            continue

        if not isinstance(value, (int, float)) or isinstance(value, bool):
            raise BadRequest(f"{metric} must be a number")

        if value < 0:
            raise BadRequest(f"{metric} must not be negative")

        upper = _BOUNDED_METRICS.get(metric)
        if upper is not None and value > upper:
            raise BadRequest(f"{metric} must be between 0 and {upper}")

        cleaned[metric] = value

    # CLUSTOX: always all four keys, None for the ones the form cleared.
    # The form omits empty fields, so clearing every field posts `{}` -- and
    # `save_settings` treats a falsy setting_data as "no data supplied" and
    # substitutes get_default_setting_data(). "Clear everything to go back to
    # inheriting" therefore used to *write* whatever the defaults were. A
    # dict of four Nones is truthy, round-trips through
    # _adapt_benchmark_setting_from_json unchanged, and resolve_benchmarks'
    # `is not None` check then falls back per metric, which is the point.
    return {metric: cleaned.get(metric) for metric in BENCHMARK_METRICS}


def empty_benchmark_settings(
    entity_type: EntityType, entity_id: str
) -> ConfigurationSettings:
    """An all-`None` benchmark setting that is NOT persisted.

    CLUSTOX: a GET must never materialise a row. Reading the config form for
    a team that has never set a benchmark used to write a TEAM-scoped row,
    which permanently killed that team's per-metric inheritance -- and the
    same on the global route meant one admin opening one form created the
    installation-wide baseline. Returning this instead keeps "nothing
    configured anywhere" reachable, which is the state the spec requires
    every card to render unchanged in.
    """
    now: datetime = time_now()
    return ConfigurationSettings(
        entity_id=entity_id,
        entity_type=entity_type,
        specific_settings=BenchmarkSetting(),
        updated_by=None,
        created_at=now,
        updated_at=now,
    )


def get_resolved_benchmarks_for_team(team_id: str, settings_service=None) -> Dict:
    """Resolve a team's benchmarks against the global baseline.

    CLUSTOX: `settings_service` is injectable so the resolution order can be
    tested without a database.
    """
    from mhq.service.settings.configuration_settings import get_settings_service
    from mhq.store.models.settings import SettingType

    settings_service = settings_service or get_settings_service()

    team_setting = settings_service.get_settings(
        SettingType.BENCHMARK_SETTING, EntityType.TEAM, team_id
    )
    global_setting = settings_service.get_settings(
        SettingType.BENCHMARK_SETTING, EntityType.GLOBAL, GLOBAL_BENCHMARK_ENTITY_ID
    )

    return resolve_benchmarks(
        getattr(team_setting, "specific_settings", None),
        getattr(global_setting, "specific_settings", None),
    )
