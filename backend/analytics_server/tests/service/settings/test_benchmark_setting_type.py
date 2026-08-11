from mhq.service.settings.default_settings_data import get_default_setting_data
from mhq.service.settings.models import BenchmarkSetting
from mhq.service.settings.setting_type_validator import settings_type_validator
from mhq.store.models.settings import SettingType
from mhq.store.models.settings.enums import EntityType


def test_benchmark_setting_type_exists():
    assert SettingType.BENCHMARK_SETTING.value == "BENCHMARK_SETTING"


def test_global_entity_type_exists():
    # The superadmin baseline belongs to no team and no workspace.
    assert EntityType.GLOBAL.value == "GLOBAL"


def test_validator_accepts_the_new_type():
    assert settings_type_validator("BENCHMARK_SETTING") == SettingType.BENCHMARK_SETTING


def test_default_baseline_has_all_four_metrics():
    data = get_default_setting_data(SettingType.BENCHMARK_SETTING)

    assert set(data.keys()) == {
        "lead_time",
        "deployment_frequency",
        "change_failure_rate",
        "mean_time_to_recovery",
    }


def test_benchmark_setting_fields_default_to_none():
    # Every field is optional: a team may set one target and inherit the rest.
    setting = BenchmarkSetting()

    assert setting.lead_time is None
    assert setting.deployment_frequency is None
    assert setting.change_failure_rate is None
    assert setting.mean_time_to_recovery is None
