from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Tuple

from mhq.store.models.incidents import (
    OrgIncidentService,
    Incident,
    IncidentOrgIncidentServiceMap,
)


class IncidentsProviderETLHandler(ABC):
    @abstractmethod
    def check_pat_validity(self) -> bool:
        """
        This method checks if the PAT is valid.
        :return: True if PAT is valid, False otherwise
        :raises: Exception if PAT is invalid
        """

    @abstractmethod
    def get_updated_incident_services(
        self, incident_services: List[OrgIncidentService]
    ) -> List[OrgIncidentService]:
        """
        This method returns the updated incident services.
        :param incident_services: List of incident services
        :return: List of updated incident services
        """

    @abstractmethod
    def process_service_incidents(
        self, incident_service: OrgIncidentService, bookmark: datetime
    ) -> Tuple[List[Incident], List[IncidentOrgIncidentServiceMap], datetime]:
        """
        This method processes the incidents for the incident services.
        :param incident_service: Incident service object
        :param bookmark: datetime object
        :return: Tuple of incidents, incident service map and incidents bookmark
        """
