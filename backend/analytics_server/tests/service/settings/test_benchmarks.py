import pytest
from werkzeug.exceptions import BadRequest

from mhq.service.settings.benchmarks import (
    BENCHMARK_METRICS,
    resolve_benchmarks,
    validate_benchmark_payload,
)
from mhq.service.settings.models import BenchmarkSetting


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


def test_validation_keeps_zero_and_omits_nothing_else():
    cleaned = validate_benchmark_payload({"change_failure_rate": 0})

    assert cleaned == {"change_failure_rate": 0}


def test_validation_accepts_a_partial_payload():
    cleaned = validate_benchmark_payload({"lead_time": 3600})

    assert cleaned == {"lead_time": 3600}


def test_resolution_asks_for_the_team_row_and_the_global_row():
    from mhq.service.settings.benchmarks import GLOBAL_BENCHMARK_ENTITY_ID
    from mhq.store.models.settings import SettingType
    from mhq.store.models.settings.enums import EntityType

    asked = []

    class FakeSettingsService:
        def get_settings(self, setting_type, entity_type, entity_id):
            asked.append((setting_type, entity_type, entity_id))
            return None

    from mhq.api.deployment_analytics import get_resolved_benchmarks_for_team

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
