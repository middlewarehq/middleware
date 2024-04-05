from dataclasses import dataclass
from datetime import datetime
from typing import List

from dora.store.models import EntityType

from dora.store.models.incidents import IncidentSource, IncidentType


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
