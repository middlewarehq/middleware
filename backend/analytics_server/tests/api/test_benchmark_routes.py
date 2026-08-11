# CLUSTOX: route-level tests for the benchmark settings surface.
#
# These deliberately go through Flask's test client rather than calling the
# service functions, because every benchmark defect this branch shipped lived
# in the seam between a correct function and its caller: resolved targets
# attached to a response no card read, a GET that wrote a row, a cleared form
# that saved defaults. Unit tests on resolve_benchmarks and
# validate_benchmark_payload cannot see any of that -- they were passing the
# whole time.
import pytest
from flask import Flask

import mhq.api.settings as settings_module
from mhq.service.settings.benchmarks import (
    BENCHMARK_METRICS,
    GLOBAL_BENCHMARK_ENTITY_ID,
)
from mhq.service.settings.models import BenchmarkSetting, ConfigurationSettings
from mhq.store.models.settings import SettingType
from mhq.store.models.settings.enums import EntityType
from mhq.utils.time import time_now

TEAM_ID = "b8b069ff-048d-4635-b859-9a6609e34cf4"
ORG_ID = "e2a1d0ea-9f0e-4d3e-9b23-4a7c1e5d0f11"


class FakeTeam:
    id = TEAM_ID
    org_id = ORG_ID


class FakeQueryValidator:
    def team_validator(self, team_id):
        return FakeTeam()

    def user_validator(self, user_id):
        raise AssertionError("no setter in these tests")


class FakeSettingsService:
    """Records writes so a test can assert a GET did not perform one."""

    def __init__(self, rows=None):
        self.rows = rows or {}
        self.saved = []

    def get_settings(self, setting_type, entity_type, entity_id):
        return self.rows.get((setting_type, entity_type, str(entity_id)))

    def save_settings(
        self, setting_type, entity_type, entity_id, setter=None, setting_data=None
    ):
        self.saved.append((setting_type, entity_type, str(entity_id), setting_data))
        saved = _settings_row(entity_type, entity_id, setting_data or {})
        self.rows[(setting_type, entity_type, str(entity_id))] = saved
        return saved


def _settings_row(entity_type, entity_id, data):
    now = time_now()
    return ConfigurationSettings(
        entity_id=entity_id,
        entity_type=entity_type,
        specific_settings=BenchmarkSetting(
            lead_time=data.get("lead_time"),
            deployment_frequency=data.get("deployment_frequency"),
            change_failure_rate=data.get("change_failure_rate"),
            mean_time_to_recovery=data.get("mean_time_to_recovery"),
        ),
        updated_by=None,
        created_at=now,
        updated_at=now,
    )


@pytest.fixture
def routes(monkeypatch):
    service = FakeSettingsService()

    monkeypatch.setattr(
        settings_module, "get_query_validator", lambda: FakeQueryValidator()
    )
    monkeypatch.setattr(settings_module, "get_settings_service", lambda: service)
    # get_resolved_benchmarks_for_team resolves its service lazily, from the
    # module it lives next to.
    monkeypatch.setattr(
        "mhq.service.settings.configuration_settings.get_settings_service",
        lambda: service,
    )

    app = Flask(__name__)
    app.register_blueprint(settings_module.app)
    return app.test_client(), service


def _team_row(service, **values):
    service.rows[(SettingType.BENCHMARK_SETTING, EntityType.TEAM, TEAM_ID)] = (
        _settings_row(EntityType.TEAM, TEAM_ID, values)
    )


def _global_row(service, **values):
    service.rows[
        (SettingType.BENCHMARK_SETTING, EntityType.GLOBAL, GLOBAL_BENCHMARK_ENTITY_ID)
    ] = _settings_row(EntityType.GLOBAL, GLOBAL_BENCHMARK_ENTITY_ID, values)


def test_the_benchmarks_route_serves_resolved_targets_over_http(routes):
    # The shape the four DORA cards read out of metrics_summary.benchmarks:
    # `<metric>.target` and `<metric>.source`. If this body changes, every
    # card silently renders nothing.
    client, service = routes
    _team_row(service, lead_time=3600)
    _global_row(service, lead_time=86400, deployment_frequency=5)

    response = client.get(f"/teams/{TEAM_ID}/benchmarks")

    assert response.status_code == 200
    assert response.json == {
        "lead_time": {"target": 3600, "source": "team"},
        "deployment_frequency": {"target": 5, "source": "global"},
        "change_failure_rate": {"target": None, "source": None},
        "mean_time_to_recovery": {"target": None, "source": None},
    }


def test_the_benchmarks_route_is_all_null_when_nothing_is_configured(routes):
    # The zero-config state, over the wire. Every card must be able to see
    # "no target" and render exactly as it did before this feature.
    client, service = routes

    response = client.get(f"/teams/{TEAM_ID}/benchmarks")

    assert response.status_code == 200
    assert response.json == {
        metric: {"target": None, "source": None} for metric in BENCHMARK_METRICS
    }
    assert service.saved == [], "resolving benchmarks must not write anything"


def test_reading_a_team_benchmark_does_not_create_a_team_row(routes):
    client, service = routes

    response = client.get(
        f"/teams/{TEAM_ID}/settings", query_string={"setting_type": "BENCHMARK_SETTING"}
    )

    assert response.status_code == 200
    assert response.json["setting"] == {metric: None for metric in BENCHMARK_METRICS}
    # The bug: an auto-created row of defaults ended that team's per-metric
    # inheritance forever, and made the card claim "your team's benchmark".
    assert service.saved == []


def test_reading_the_global_baseline_does_not_create_the_global_row(routes):
    client, service = routes

    response = client.get(
        "/settings/global", query_string={"setting_type": "BENCHMARK_SETTING"}
    )

    assert response.status_code == 200
    assert response.json["setting"] == {metric: None for metric in BENCHMARK_METRICS}
    assert response.json["scope"] == "global"
    assert service.saved == []


def test_a_non_benchmark_read_still_auto_creates_its_row(routes):
    # The auto-create is pre-existing behaviour other setting types rely on;
    # only benchmarks opt out of it.
    client, service = routes

    client.get(
        f"/teams/{TEAM_ID}/settings", query_string={"setting_type": "INCIDENT_SETTING"}
    )

    assert service.saved == [
        (SettingType.INCIDENT_SETTING, EntityType.TEAM, TEAM_ID, None)
    ]


def test_clearing_every_field_on_a_team_writes_nulls_not_defaults(routes):
    client, service = routes
    _team_row(service, lead_time=3600, change_failure_rate=10)

    response = client.put(
        f"/teams/{TEAM_ID}/settings",
        json={"setting_type": "BENCHMARK_SETTING", "setting_data": {}},
    )

    assert response.status_code == 200
    assert response.json["setting"] == {metric: None for metric in BENCHMARK_METRICS}
    _, _, _, written = service.saved[-1]
    assert written == {metric: None for metric in BENCHMARK_METRICS}


def test_a_team_put_rejects_an_out_of_range_value(routes):
    client, service = routes

    response = client.put(
        f"/teams/{TEAM_ID}/settings",
        json={
            "setting_type": "BENCHMARK_SETTING",
            "setting_data": {"change_failure_rate": 5000},
        },
    )

    assert response.status_code == 400
    assert service.saved == []


def test_a_team_put_rejects_a_typoed_metric_key(routes):
    # Silently dropping this key stored nothing and reported success.
    client, service = routes

    response = client.put(
        f"/teams/{TEAM_ID}/settings",
        json={"setting_type": "BENCHMARK_SETTING", "setting_data": {"leadtime": 3600}},
    )

    assert response.status_code == 400
    assert service.saved == []


def test_a_team_put_of_a_non_benchmark_setting_skips_benchmark_validation(routes):
    client, service = routes

    response = client.put(
        f"/teams/{TEAM_ID}/settings",
        json={
            "setting_type": "INCIDENT_SETTING",
            "setting_data": {"title_includes": ["outage"]},
        },
    )

    assert response.status_code == 200
    assert service.saved[-1][0] == SettingType.INCIDENT_SETTING


@pytest.mark.parametrize("method", ["get", "put"])
def test_the_global_scope_refuses_non_benchmark_setting_types(routes, method):
    client, service = routes

    if method == "get":
        response = client.get(
            "/settings/global", query_string={"setting_type": "INCIDENT_SETTING"}
        )
    else:
        response = client.put(
            "/settings/global",
            json={"setting_type": "INCIDENT_SETTING", "setting_data": {}},
        )

    assert response.status_code == 400
    assert service.saved == []
