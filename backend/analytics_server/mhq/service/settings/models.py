from dataclasses import dataclass
from datetime import datetime
from typing import List, TypedDict, Literal, Optional

from mhq.store.models import EntityType
from mhq.store.models.incidents.enums import IncidentSource, IncidentType


@dataclass
class BaseSetting:
    pass


@dataclass
class ConfigurationSettings:
    entity_id: str
    entity_type: EntityType
    specific_settings: BaseSetting
    updated_by: str
    created_at: datetime
    updated_at: datetime


@dataclass
class IncidentSettings(BaseSetting):
    title_filters: List[str]


@dataclass
class ExcludedPRsSetting(BaseSetting):
    excluded_pr_ids: List[str]


@dataclass
class IncidentTypesSetting(BaseSetting):
    incident_types: List[IncidentType]


@dataclass
class IncidentSourcesSetting(BaseSetting):
    incident_sources: List[IncidentSource]


@dataclass
class DefaultSyncDaysSetting(BaseSetting):
    default_sync_days: int


class IncidentPRFilter(TypedDict):
    field: Literal["title", "head_branch"]
    value: str


@dataclass
class IncidentPRsSetting(BaseSetting):
    include_revert_prs: bool
    filters: List[IncidentPRFilter]


# CLUSTOX: every field is optional so fallback is per metric, not
# all-or-nothing -- a team may set a lead-time target and inherit the rest.
@dataclass
class BenchmarkSetting(BaseSetting):
    lead_time: Optional[float] = None
    deployment_frequency: Optional[float] = None
    change_failure_rate: Optional[float] = None
    mean_time_to_recovery: Optional[float] = None
    # CLUSTOX: average gross lines (additions + deletions) per merged PR --
    # NOT weekly volume. Its unit is lines, so unlike lead_time and
    # mean_time_to_recovery it is stored exactly as the admin typed it, with
    # no seconds/hours conversion at any boundary.
    lines_of_code: Optional[float] = None


# ADD NEW SETTING CLASS HERE

# Sample Future Settings
# @dataclass
# class PRSettings(BaseSetting):
#     number_filters: List[str]
#     merge_time: List[str]
