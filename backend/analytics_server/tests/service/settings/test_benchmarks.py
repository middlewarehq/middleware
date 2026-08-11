from datetime import datetime

import pytest
from werkzeug.exceptions import BadRequest

from mhq.api.resources.settings_resource import adapt_configuration_settings_response
from mhq.service.settings.benchmarks import (
    BENCHMARK_METRICS,
    resolve_benchmarks,
    validate_benchmark_payload,
)
from mhq.service.settings.models import BenchmarkSetting, ConfigurationSettings
from mhq.store.models.settings.enums import EntityType


def test_team_value_wins_and_reports_its_source():
    team = BenchmarkSetting(lead_time=3600)
    glob = BenchmarkSetting(lead_time=86400)

    resolved = resolve_benchmarks(team, glob)

    assert resolved["lead_time"] == {"target": 3600, "source": "team"}


def test_absent_team_value_falls_back_to_global():
    team = BenchmarkSetting(lead_time=3600)
    glob = BenchmarkSetting(lead_time=86400, deployment_frequency=5)

    resolved = resolve_benchmarks(team, glob)

    assert resolved["deployment_frequency"] == {"target": 5, "source": "global"}


def test_neither_set_yields_no_target():
    resolved = resolve_benchmarks(BenchmarkSetting(), BenchmarkSetting())

    assert resolved["change_failure_rate"] == {"target": None, "source": None}


def test_metrics_mix_sources_within_one_response():
    # The case that makes per-metric fallback worth having.
    team = BenchmarkSetting(lead_time=3600)
    glob = BenchmarkSetting(lead_time=86400, deployment_frequency=5)

    resolved = resolve_benchmarks(team, glob)

    assert resolved["lead_time"]["source"] == "team"
    assert resolved["deployment_frequency"]["source"] == "global"
    assert resolved["mean_time_to_recovery"]["source"] is None


def test_zero_is_a_real_target_not_an_absent_one():
    # A team targeting zero failures must not silently inherit 15%.
    team = BenchmarkSetting(change_failure_rate=0)
    glob = BenchmarkSetting(change_failure_rate=15)

    resolved = resolve_benchmarks(team, glob)

    assert resolved["change_failure_rate"] == {"target": 0, "source": "team"}


def test_missing_settings_are_treated_as_empty():
    resolved = resolve_benchmarks(None, None)

    assert set(resolved.keys()) == set(BENCHMARK_METRICS)
    assert all(v["target"] is None for v in resolved.values())


def test_validation_rejects_negatives():
    with pytest.raises(BadRequest):
        validate_benchmark_payload({"lead_time": -1})


def test_validation_rejects_change_failure_rate_above_100():
    with pytest.raises(BadRequest):
        validate_benchmark_payload({"change_failure_rate": 101})


def test_validation_rejects_unknown_keys():
    # A typo would otherwise store silently and inherit forever.
    with pytest.raises(BadRequest):
        validate_benchmark_payload({"leadtime": 3600})


def test_validation_rejects_booleans():
    # `False is not None`, so a boolean surviving validation would reach
    # resolve_benchmarks and be emitted as {"target": false} -- a target the
    # cards would then try to draw a line at.
    with pytest.raises(BadRequest):
        validate_benchmark_payload({"deployment_frequency": True})

    with pytest.raises(BadRequest):
        validate_benchmark_payload({"deployment_frequency": False})


def test_validation_keeps_zero_and_nulls_the_rest():
    cleaned = validate_benchmark_payload({"change_failure_rate": 0})

    # 0 survives as a real target; the untouched metrics come back as
    # explicit Nones rather than absent keys.
    assert cleaned == {
        "lead_time": None,
        "deployment_frequency": None,
        "change_failure_rate": 0,
        "mean_time_to_recovery": None,
    }


def test_validation_accepts_a_partial_payload():
    cleaned = validate_benchmark_payload({"lead_time": 3600})

    assert cleaned["lead_time"] == 3600
    assert set(cleaned.keys()) == set(BENCHMARK_METRICS)


def test_clearing_every_field_is_a_truthy_all_none_payload():
    # The form omits empty fields, so clearing all four posts `{}`.
    # save_settings substitutes get_default_setting_data() for a *falsy*
    # setting_data, so an empty dict here would write defaults instead of
    # clearing -- "clear everything to go back to inheriting" has to survive
    # this function as something truthy that means "no target anywhere".
    cleaned = validate_benchmark_payload({})

    assert cleaned == {metric: None for metric in BENCHMARK_METRICS}
    assert cleaned, "an all-None payload must stay truthy for save_settings"


def test_the_shipped_default_sets_no_target_at_any_scope():
    # Zero-config: nothing may invent a benchmark. A default with numbers in
    # it gave every card a target line and a "the default benchmark" caption
    # the first time any settings form was opened.
    from mhq.service.settings.default_settings_data import get_default_setting_data
    from mhq.store.models.settings import SettingType

    default = get_default_setting_data(SettingType.BENCHMARK_SETTING)

    assert default == {metric: None for metric in BENCHMARK_METRICS}


def test_an_unsaved_benchmark_setting_is_all_none_and_not_persisted():
    from mhq.service.settings.benchmarks import empty_benchmark_settings
    from mhq.store.models.settings.enums import EntityType

    settings = empty_benchmark_settings(EntityType.TEAM, "team-1")

    response = adapt_configuration_settings_response(settings)

    assert response["setting"] == {metric: None for metric in BENCHMARK_METRICS}
    assert response["team_id"] == "team-1"


def test_resolution_asks_for_the_team_row_and_the_global_row():
    from mhq.service.settings.benchmarks import GLOBAL_BENCHMARK_ENTITY_ID
    from mhq.store.models.settings import SettingType
    from mhq.store.models.settings.enums import EntityType

    asked = []

    class FakeSettingsService:
        def get_settings(self, setting_type, entity_type, entity_id):
            asked.append((setting_type, entity_type, entity_id))
            return None

    from mhq.service.settings.benchmarks import get_resolved_benchmarks_for_team

    get_resolved_benchmarks_for_team("team-1", settings_service=FakeSettingsService())

    assert (
        SettingType.BENCHMARK_SETTING,
        EntityType.TEAM,
        "team-1",
    ) in asked
    assert (
        SettingType.BENCHMARK_SETTING,
        EntityType.GLOBAL,
        GLOBAL_BENCHMARK_ENTITY_ID,
    ) in asked


def test_benchmark_setting_response_always_has_all_four_keys():
    # Set, zero, and unset must all round-trip distinctly: a dropped or
    # zero-coerced key would make the config form unable to tell "inherit"
    # apart from "target of 0".
    config_settings = ConfigurationSettings(
        entity_id="team-1",
        entity_type=EntityType.TEAM,
        specific_settings=BenchmarkSetting(lead_time=3600, change_failure_rate=0),
        updated_by=None,
        created_at=datetime(2026, 1, 1),
        updated_at=datetime(2026, 1, 1),
    )

    response = adapt_configuration_settings_response(config_settings)

    assert response["setting"] == {
        "lead_time": 3600,
        "deployment_frequency": None,
        "change_failure_rate": 0,
        "mean_time_to_recovery": None,
    }


def test_global_benchmark_row_reports_scope_not_the_sentinel_id():
    from mhq.service.settings.benchmarks import GLOBAL_BENCHMARK_ENTITY_ID

    config_settings = ConfigurationSettings(
        entity_id=GLOBAL_BENCHMARK_ENTITY_ID,
        entity_type=EntityType.GLOBAL,
        specific_settings=BenchmarkSetting(lead_time=3600),
        updated_by=None,
        created_at=datetime(2026, 1, 1),
        updated_at=datetime(2026, 1, 1),
    )

    response = adapt_configuration_settings_response(config_settings)

    assert response["scope"] == "global"
    assert "team_id" not in response
    assert "org_id" not in response
    assert "user_id" not in response
