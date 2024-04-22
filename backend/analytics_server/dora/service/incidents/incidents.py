from collections import defaultdict
from datetime import datetime
from typing import List, Dict, Tuple
from dora.service.incidents.models.mean_time_to_recovery import (
    ChangeFailureRateMetrics,
    MeanTimeToRecoveryMetrics,
)
from dora.service.deployments.models.models import Deployment
from dora.service.incidents.incident_filter import apply_incident_filter
from dora.store.models.incidents.filter import IncidentFilter
from dora.store.models.settings import EntityType, SettingType
from dora.utils.time import (
    Interval,
    fill_missing_week_buckets,
    generate_expanded_buckets,
    get_given_weeks_monday,
)

from dora.store.models.incidents import Incident
from dora.service.settings.configuration_settings import (
    SettingsService,
    get_settings_service,
)
from dora.store.repos.incidents import IncidentsRepoService


class IncidentService:
    def __init__(
        self,
        incidents_repo_service: IncidentsRepoService,
        settings_service: SettingsService,
    ):
        self._incidents_repo_service = incidents_repo_service
        self._settings_service = settings_service

    def get_resolved_team_incidents(
        self, team_id: str, interval: Interval
    ) -> List[Incident]:
        incident_filter: IncidentFilter = apply_incident_filter(
            entity_type=EntityType.TEAM,
            entity_id=team_id,
            setting_types=[
                SettingType.INCIDENT_SETTING,
                SettingType.INCIDENT_TYPES_SETTING,
            ],
        )
        return self._incidents_repo_service.get_resolved_team_incidents(
            team_id, interval, incident_filter
        )

    def get_team_incidents(self, team_id: str, interval: Interval) -> List[Incident]:
        incident_filter: IncidentFilter = apply_incident_filter(
            entity_type=EntityType.TEAM,
            entity_id=team_id,
            setting_types=[
                SettingType.INCIDENT_SETTING,
                SettingType.INCIDENT_TYPES_SETTING,
            ],
        )
        return self._incidents_repo_service.get_team_incidents(
            team_id, interval, incident_filter
        )

    def get_deployment_incidents_map(
        self, deployments: List[Deployment], incidents: List[Incident]
    ):
        deployments = sorted(deployments, key=lambda x: x.conducted_at)
        incidents = sorted(incidents, key=lambda x: x.creation_date)
        incidents_pointer = 0

        deployment_incidents_map: Dict[Deployment, List[Incident]] = defaultdict(list)

        for current_deployment, next_deployment in zip(
            deployments, deployments[1:] + [None]
        ):
            current_deployment_incidents = []

            if incidents_pointer >= len(incidents):
                deployment_incidents_map[
                    current_deployment
                ] = current_deployment_incidents
                continue

            while incidents_pointer < len(incidents):
                incident = incidents[incidents_pointer]

                if incident.creation_date >= current_deployment.conducted_at and (
                    next_deployment is None
                    or incident.creation_date < next_deployment.conducted_at
                ):
                    current_deployment_incidents.append(incident)
                    incidents_pointer += 1
                elif incident.creation_date < current_deployment.conducted_at:
                    incidents_pointer += 1
                else:
                    break

            deployment_incidents_map[current_deployment] = current_deployment_incidents

        return deployment_incidents_map

    def get_team_mean_time_to_recovery(
        self, team_id: str, interval: Interval
    ) -> MeanTimeToRecoveryMetrics:

        resolved_team_incidents = self.get_resolved_team_incidents(team_id, interval)

        return self._get_incidents_mean_time_to_recovery(resolved_team_incidents)

    def get_team_mean_time_to_recovery_trends(
        self, team_id: str, interval: Interval
    ) -> MeanTimeToRecoveryMetrics:

        resolved_team_incidents = self.get_resolved_team_incidents(team_id, interval)

        weekly_resolved_team_incidents: Dict[
            datetime, List[Incident]
        ] = generate_expanded_buckets(
            resolved_team_incidents, interval, "resolved_date", "weekly"
        )

        weekly_mean_time_to_recovery: Dict[datetime, MeanTimeToRecoveryMetrics] = {}

        for week, incidents in weekly_resolved_team_incidents.items():

            if incidents:
                weekly_mean_time_to_recovery[
                    week
                ] = self._get_incidents_mean_time_to_recovery(incidents)
            else:
                weekly_mean_time_to_recovery[week] = MeanTimeToRecoveryMetrics()

        return weekly_mean_time_to_recovery

    def calculate_change_failure_deployments(
        self, deployment_incidents_map: Dict[Deployment, List[Incident]]
    ) -> Tuple[List[Deployment], List[Deployment]]:
        failed_deployments = [
            deployment
            for deployment, incidents in deployment_incidents_map.items()
            if incidents
        ]
        all_deployments: List[Deployment] = list(deployment_incidents_map.keys())

        return failed_deployments, all_deployments

    def get_change_failure_rate_metrics(
        self, deployments: List[Deployment], incidents: List[Incident]
    ) -> ChangeFailureRateMetrics:
        deployment_incidents_map = self.get_deployment_incidents_map(
            deployments, incidents
        )
        (
            failed_deployments,
            all_deployments,
        ) = self.calculate_change_failure_deployments(deployment_incidents_map)
        return ChangeFailureRateMetrics(set(failed_deployments), set(all_deployments))

    def get_weekly_change_failure_rate(
        self,
        interval: Interval,
        deployments: List[Deployment],
        incidents: List[Incident],
    ) -> ChangeFailureRateMetrics:

        deployments_incidents_map = self.get_deployment_incidents_map(
            deployments, incidents
        )
        week_start_to_change_failure_rate_map: Dict[
            datetime, ChangeFailureRateMetrics
        ] = defaultdict(ChangeFailureRateMetrics)

        for deployment, incidents in deployments_incidents_map.items():
            week_start_date = get_given_weeks_monday(deployment.conducted_at)
            if incidents:
                week_start_to_change_failure_rate_map[
                    week_start_date
                ].failed_deployments.add(deployment)
            week_start_to_change_failure_rate_map[
                week_start_date
            ].total_deployments.add(deployment)

        return fill_missing_week_buckets(
            week_start_to_change_failure_rate_map, interval, ChangeFailureRateMetrics
        )

    def _calculate_incident_resolution_time(self, incident: Incident) -> int:
        return (incident.resolved_date - incident.creation_date).total_seconds()

    def _get_incidents_mean_time_to_recovery(
        self, resolved_incidents: List[Incident]
    ) -> MeanTimeToRecoveryMetrics:

        incident_count = len(resolved_incidents)

        if not incident_count:
            return MeanTimeToRecoveryMetrics()

        mean_time_to_recovery = (
            sum(
                [
                    self._calculate_incident_resolution_time(incident)
                    for incident in resolved_incidents
                ]
            )
            / incident_count
        )

        return MeanTimeToRecoveryMetrics(mean_time_to_recovery, incident_count)


def get_incident_service():
    return IncidentService(IncidentsRepoService(), get_settings_service())
