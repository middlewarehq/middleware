from dataclasses import dataclass
from typing import List

from sqlalchemy import or_

from dora.store.models.incidents.incidents import Incident


@dataclass
class IncidentFilter:
    """Dataclass for filtering incidents."""

    title_filter_substrings: List[str] = None
    incident_types: List[str] = None

    @property
    def filter_query(self) -> List:
        def _title_filter_substrings_query():
            if not self.title_filter_substrings:
                return None

            return or_(
                Incident.title.contains(substring, autoescape=True)
                for substring in self.title_filter_substrings
            )

        def _incident_type_query():
            if not self.incident_types:
                return None

            return or_(
                Incident.incident_type == incident_type
                for incident_type in self.incident_types
            )

        conditions = {
            "title_filter_substrings": _title_filter_substrings_query(),
            "incident_types": _incident_type_query(),
        }

        return [
            conditions[x]
            for x in self.__dict__.keys()
            if getattr(self, x) is not None and conditions[x] is not None
        ]
