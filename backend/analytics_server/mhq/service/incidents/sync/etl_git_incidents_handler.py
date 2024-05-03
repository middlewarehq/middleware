from datetime import datetime
from typing import List, Dict, Optional, Tuple

from mhq.exapi.git_incidents import (
    GitIncidentsAPIService,
    get_git_incidents_api_service,
)
from mhq.exapi.models.git_incidents import RevertPRMap
from mhq.service.incidents.sync.etl_provider_handler import IncidentsProviderETLHandler
from mhq.store.models.code import OrgRepo, PullRequest
from mhq.store.models.incidents import (
    IncidentSource,
    OrgIncidentService,
    IncidentType,
    IncidentsBookmark,
    IncidentOrgIncidentServiceMap,
    IncidentStatus,
    Incident,
    IncidentProvider,
)
from mhq.store.repos.incidents import IncidentsRepoService
from mhq.utils.log import LOG
from mhq.utils.string import uuid4_str
from mhq.utils.time import time_now


class GitIncidentsETLHandler(IncidentsProviderETLHandler):
    def __init__(
        self,
        org_id: str,
        git_incidents_api_service: GitIncidentsAPIService,
        incidents_repo_service: IncidentsRepoService,
    ):
        self.org_id = org_id
        self.git_incidents_api_service = git_incidents_api_service
        self.incidents_repo_service = incidents_repo_service

    def check_pat_validity(self) -> bool:
        """
        Checks if Incident Source, "GIT_REPO" is enabled for the org
        :return: True if enabled, False otherwise
        """
        return self.git_incidents_api_service.is_sync_enabled(self.org_id)

    def get_updated_incident_services(
        self, incident_services: List[OrgIncidentService]
    ) -> List[OrgIncidentService]:
        """
        Get the updated Incident Services for the org
        :param incident_services: List of Incident Services
        :return: List of updated Incident Services
        """
        git_repo_type_incident_services = [
            incident_service
            for incident_service in incident_services
            if incident_service.source_type == IncidentSource.GIT_REPO
        ]
        active_org_repos: List[OrgRepo] = self.git_incidents_api_service.get_org_repos(
            self.org_id
        )

        key_to_service_map: Dict[str, OrgIncidentService] = {
            incident_service.key: incident_service
            for incident_service in git_repo_type_incident_services
        }

        updated_services: List[OrgIncidentService] = []

        for org_repo in active_org_repos:
            updated_services.append(
                self._adapt_org_incident_service(
                    org_repo, key_to_service_map.get(str(org_repo.id))
                )
            )

        return updated_services

    def process_service_incidents(
        self,
        incident_service: OrgIncidentService,
        bookmark: IncidentsBookmark,
    ) -> Tuple[List[Incident], List[IncidentOrgIncidentServiceMap], IncidentsBookmark]:
        """
        Sync incidents for the service
        :param incident_service: OrgIncidentService
        :param bookmark: IncidentsBookmark
        :return: List of Incidents, List of IncidentOrgIncidentServiceMap, IncidentsBookmark
        """
        if not incident_service or not isinstance(incident_service, OrgIncidentService):
            raise Exception(f"Service not found")

        from_time: datetime = bookmark.bookmark
        to_time: datetime = time_now()

        revert_pr_incidents: List[
            RevertPRMap
        ] = self.git_incidents_api_service.get_repo_revert_prs_in_interval(
            incident_service.key, from_time, to_time
        )
        if not revert_pr_incidents:
            LOG.warning(
                f"[GIT Incidents Sync] Incidents not received for service {str(incident_service.id)} "
                f"in org {self.org_id} since {from_time.isoformat()}"
            )
            return [], [], bookmark

        revert_pr_incidents.sort(
            key=lambda revert_pr_incident: revert_pr_incident.updated_at
        )

        bookmark.bookmark = max(bookmark.bookmark, revert_pr_incidents[-1].updated_at)

        incidents, incident_org_incident_service_map_models = self._process_incidents(
            incident_service, revert_pr_incidents
        )

        return incidents, incident_org_incident_service_map_models, bookmark

    def _process_incidents(
        self,
        org_incident_service: OrgIncidentService,
        revert_pr_incidents: List[RevertPRMap],
    ) -> Tuple[List[Incident], List[IncidentOrgIncidentServiceMap]]:

        if not revert_pr_incidents:
            LOG.warning(
                f"[GitIncidentsService Incident Sync] Incidents not received for "
                f"service {str(org_incident_service.id)} in org {self.org_id}"
            )
            return [], []

        incident_models = []
        incident_org_incident_service_map_models = []

        for revert_pr_incident in revert_pr_incidents:
            try:
                incident, incident_service_map = self._process_revert_pr_incident(
                    org_incident_service, revert_pr_incident
                )
                incident_models.append(incident)
                incident_org_incident_service_map_models.append(incident_service_map)
            except Exception as e:
                LOG.error(
                    f"ERROR processing revert pr Incident in service {str(org_incident_service.id)} in "
                    f"org {str(org_incident_service.org_id)}, Error: {str(e)}"
                )
                raise e

        return incident_models, incident_org_incident_service_map_models

    def _process_revert_pr_incident(
        self, org_incident_service: OrgIncidentService, revert_pr_map: RevertPRMap
    ) -> Tuple[Incident, IncidentOrgIncidentServiceMap]:
        incident_unique_id = str(revert_pr_map.original_pr.id)
        existing_incident: Optional[
            Incident
        ] = self.incidents_repo_service.get_incident_by_key_type_and_provider(
            incident_unique_id,
            IncidentType.REVERT_PR,
            IncidentProvider(org_incident_service.provider),
        )
        incident_id = existing_incident.id if existing_incident else uuid4_str()

        incident = Incident(
            id=incident_id,
            provider=org_incident_service.provider,
            key=str(incident_unique_id),
            title=revert_pr_map.original_pr.title,
            incident_number=int(revert_pr_map.original_pr.number),
            status=IncidentStatus.RESOLVED.value,
            creation_date=revert_pr_map.original_pr.state_changed_at,
            acknowledged_date=revert_pr_map.revert_pr.created_at,
            resolved_date=revert_pr_map.revert_pr.state_changed_at,
            assigned_to=revert_pr_map.revert_pr.author,
            assignees=[revert_pr_map.revert_pr.author],
            url=revert_pr_map.original_pr.url,
            meta={
                "revert_pr": self._adapt_pr_to_json(revert_pr_map.revert_pr),
                "original_pr": self._adapt_pr_to_json(revert_pr_map.original_pr),
                "created_at": revert_pr_map.revert_pr.created_at.isoformat(),
                "updated_at": revert_pr_map.revert_pr.updated_at.isoformat(),
            },
            created_at=existing_incident.created_at
            if existing_incident
            else time_now(),
            updated_at=time_now(),
            incident_type=IncidentType.REVERT_PR,
        )
        incident_org_incident_service_map_model = IncidentOrgIncidentServiceMap(
            incident_id=incident_id,
            service_id=org_incident_service.id,
        )

        return incident, incident_org_incident_service_map_model

    @staticmethod
    def _adapt_org_incident_service(
        org_repo: OrgRepo,
        org_incident_service: OrgIncidentService,
    ) -> OrgIncidentService:

        return OrgIncidentService(
            id=org_incident_service.id if org_incident_service else uuid4_str(),
            org_id=org_repo.org_id,
            provider=org_repo.provider,
            name=org_repo.name,
            key=str(org_repo.id),
            meta={},
            created_at=org_incident_service.created_at
            if org_incident_service
            else time_now(),
            updated_at=time_now(),
            source_type=IncidentSource.GIT_REPO,
        )

    @staticmethod
    def _adapt_pr_to_json(pr: PullRequest) -> Dict[str, any]:
        return {
            "id": str(pr.id),
            "repo_id": str(pr.repo_id),
            "number": pr.number,
            "title": pr.title,
            "state": pr.state.value,
            "author": pr.author,
            "reviewers": pr.reviewers or [],
            "url": pr.url,
            "base_branch": pr.base_branch,
            "head_branch": pr.head_branch,
            "state_changed_at": pr.state_changed_at.isoformat()
            if pr.state_changed_at
            else None,
            "commits": pr.commits,
            "comments": pr.comments,
            "provider": pr.provider,
        }


def get_incidents_sync_etl_handler(org_id: str) -> GitIncidentsETLHandler:
    return GitIncidentsETLHandler(
        org_id,
        get_git_incidents_api_service(),
        IncidentsRepoService(),
    )
