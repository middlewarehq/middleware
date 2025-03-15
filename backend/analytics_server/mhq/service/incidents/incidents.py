from collections import defaultdict
from datetime import datetime
from typing import List, Dict, Tuple, Optional
import re
from mhq.service.settings.models import IncidentPrsSetting
from mhq.store.models.code.filter import PRFilter
from mhq.store.models.code.pull_requests import PullRequest
from mhq.store.models.incidents.enums import IncidentStatus, IncidentType
from mhq.store.repos.code import CodeRepoService
from mhq.service.incidents.models.mean_time_to_recovery import (
    ChangeFailureRateMetrics,
    MeanTimeToRecoveryMetrics,
)
from mhq.service.deployments.models.models import Deployment
from mhq.service.incidents.incident_filter import apply_incident_filter
from mhq.store.models.incidents.filter import IncidentFilter
from mhq.store.models.settings import EntityType, SettingType
from mhq.utils.time import (
    Interval,
    fill_missing_week_buckets,
    generate_expanded_buckets,
    get_given_weeks_monday,
)
from mhq.utils.regex import check_regex
from mhq.store.models.incidents import Incident
from mhq.service.settings.configuration_settings import (
    SettingsService,
    get_settings_service,
)
from mhq.store.repos.incidents import IncidentsRepoService
from mhq.service.incidents.sync.etl_git_incidents_handler import GitIncidentsETLHandler
from mhq.store.models.incidents.enums import PR_FILTER_PATTERNS


class IncidentService:
    def __init__(
        self,
        incidents_repo_service: IncidentsRepoService,
        settings_service: SettingsService,
        code_repo_service: CodeRepoService,
    ):
        self._incidents_repo_service = incidents_repo_service
        self._settings_service = settings_service
        self._code_repo_service = code_repo_service

    def get_resolved_team_incidents(
        self, team_id: str, interval: Interval, pr_filter: PRFilter
    ) -> List[Incident]:
        incident_filter: IncidentFilter = apply_incident_filter(
            entity_type=EntityType.TEAM,
            entity_id=team_id,
            setting_types=[
                SettingType.INCIDENT_SETTING,
                SettingType.INCIDENT_TYPES_SETTING,
                SettingType.INCIDENT_PRS_SETTING,
            ],
        )
        resolved_incidents = self._incidents_repo_service.get_resolved_team_incidents(
            team_id, interval, incident_filter
        )
        resolved_pr_incidents = self.get_team_pr_incidents(team_id, interval, pr_filter)

        return resolved_incidents + resolved_pr_incidents

    def get_team_incidents(
        self, team_id: str, interval: Interval, pr_filter: PRFilter
    ) -> List[Incident]:

        incident_filter: IncidentFilter = apply_incident_filter(
            entity_type=EntityType.TEAM,
            entity_id=team_id,
            setting_types=[
                SettingType.INCIDENT_SETTING,
                SettingType.INCIDENT_TYPES_SETTING,
                SettingType.INCIDENT_PRS_SETTING,
            ],
        )
        incidents = self._incidents_repo_service.get_team_incidents(
            team_id, interval, incident_filter
        )

        pr_incidents: List[Incident] = self.get_team_pr_incidents(
            team_id, interval, pr_filter
        )

        return incidents + pr_incidents

    def get_team_pr_incidents(
        self, team_id: str, interval: Interval, pr_filter: PRFilter
    ) -> List[Incident]:
        incident_prs_setting: IncidentPrsSetting = (
            self._settings_service.get_or_set_default_settings(
                setting_type=SettingType.INCIDENT_PRS_SETTING,
                entity_type=EntityType.TEAM,
                entity_id=team_id,
            ).specific_settings
        )

        if not (
            incident_prs_setting.head_branch_filters
            or incident_prs_setting.title_filters
            or incident_prs_setting.pr_mapping_field
            or incident_prs_setting.pr_mapping_pattern
        ):
            return []

        team_repo_ids = (
            tr.org_repo_id
            for tr in self._code_repo_service.get_active_team_repos_by_team_id(team_id)
        )
        prs = self._code_repo_service.get_prs_merged_in_interval(
            team_repo_ids, interval, pr_filter
        )
        repo_id_to_pr_number_to_pr_map: Dict[str, Dict[str, PullRequest]] = {}

        for pr in prs:
            if str(pr.repo_id) not in repo_id_to_pr_number_to_pr_map:
                repo_id_to_pr_number_to_pr_map[str(pr.repo_id)] = {}
            repo_id_to_pr_number_to_pr_map[str(pr.repo_id)][pr.number] = pr

        mapped_incident_prs: List[Incident] = self._get_mapped_incident_prs(
            prs, incident_prs_setting, team_repo_ids, repo_id_to_pr_number_to_pr_map
        )

        filtered_incident_prs: List[Incident] = self._filter_incident_prs(
            incident_prs_setting, repo_id_to_pr_number_to_pr_map
        )

        return mapped_incident_prs + filtered_incident_prs

    def _get_mapped_incident_prs(
        self,
        prs: List[PullRequest],
        incident_prs_setting: IncidentPrsSetting,
        team_repo_ids: List[str],
        repo_id_to_pr_number_to_pr_map: Dict[str, Dict[str, PullRequest]],
    ) -> List[Incident]:

        if (
            not incident_prs_setting.pr_mapping_field
            or not incident_prs_setting.pr_mapping_pattern
        ):
            return []

        pr_incidents: List[Incident] = []

        mapping_field = incident_prs_setting.pr_mapping_field
        pattern = incident_prs_setting.pr_mapping_pattern
        pr_numbers_match_strings: List[str] = []

        for pr in prs:
            if pr_number := self._extract_pr_number_from_pattern(
                getattr(pr, mapping_field), pattern
            ):
                if pr_number in repo_id_to_pr_number_to_pr_map[str(pr.repo_id)].keys():
                    incident_pr = repo_id_to_pr_number_to_pr_map[str(pr.repo_id)][
                        pr_number
                    ]
                    adapted_incident_pr = self._adapt_incident_pr(incident_pr, pr)
                    pr_incidents.append(adapted_incident_pr)
                    repo_id_to_pr_number_to_pr_map[str(pr.repo_id)].pop(pr.number)
                    repo_id_to_pr_number_to_pr_map[str(pr.repo_id)].pop(
                        incident_pr.number
                    )
            else:
                match_string = pattern.replace("1234", str(pr.number))
                pr_numbers_match_strings.append(match_string)

        matched_string_prs = (
            self._code_repo_service.get_prs_by_head_branch_match_strings(
                list(team_repo_ids), pr_numbers_match_strings
            )
            if mapping_field == "head_branch"
            else self._code_repo_service.get_prs_by_title_match_strings(
                list(team_repo_ids), pr_numbers_match_strings
            )
        )

        for pr in matched_string_prs:
            if pr_number := self._extract_pr_number_from_pattern(
                getattr(pr, mapping_field), pattern
            ):
                if pr_number in repo_id_to_pr_number_to_pr_map[str(pr.repo_id)].keys():
                    original_pr = repo_id_to_pr_number_to_pr_map[str(pr.repo_id)][
                        pr_number
                    ]
                    adapted_incident_pr = self._adapt_incident_pr(original_pr, pr)
                    pr_incidents.append(adapted_incident_pr)
                    repo_id_to_pr_number_to_pr_map[str(pr.repo_id)].pop(
                        original_pr.number
                    )

        return pr_incidents

    def _filter_incident_prs(
        self,
        incident_prs_setting: IncidentPrsSetting,
        repo_id_to_pr_number_to_pr_map: Dict[str, Dict[str, PullRequest]],
    ) -> List[Incident]:

        if not (
            incident_prs_setting.head_branch_filters
            or incident_prs_setting.title_filters
        ):
            return []

        pr_incidents: List[Incident] = []

        for repo_id in repo_id_to_pr_number_to_pr_map:
            original_prs: List[PullRequest] = list(
                repo_id_to_pr_number_to_pr_map[repo_id].values()
            )
            original_prs = sorted(original_prs, key=lambda x: x.state_changed_at)
            for prev_pr, current_pr in zip(original_prs, original_prs[1:]):
                matches = any(
                    branch in current_pr.head_branch
                    for branch in incident_prs_setting.head_branch_filters
                ) or any(
                    title in current_pr.title
                    for title in incident_prs_setting.title_filters
                )
                if matches:
                    adapted_pr_incident = self._adapt_incident_pr(prev_pr, current_pr)
                    pr_incidents.append(adapted_pr_incident)

        return pr_incidents

    def _extract_pr_number_from_pattern(self, text: str, pattern: str) -> Optional[str]:
        regex_pattern = PR_FILTER_PATTERNS.get(pattern)
        if regex_pattern and check_regex(regex_pattern):
            match = re.search(regex_pattern, text)
            if match:
                pr_number = int(match.group(1))
                return str(pr_number)
        return None

    def _adapt_incident_pr(
        self, incident_pr: PullRequest, resolution_pr: PullRequest
    ) -> Incident:
        return Incident(
            id=incident_pr.id,
            provider=incident_pr.provider,
            title=incident_pr.title,
            incident_number=int(incident_pr.number),
            status=IncidentStatus.RESOLVED.value,
            creation_date=incident_pr.state_changed_at,
            acknowledged_date=resolution_pr.created_at,
            resolved_date=resolution_pr.state_changed_at,
            assigned_to=resolution_pr.author,
            assignees=[resolution_pr.author],
            url=incident_pr.url,
            meta={
                "revert_pr": GitIncidentsETLHandler._adapt_pr_to_json(resolution_pr),
                "original_pr": GitIncidentsETLHandler._adapt_pr_to_json(incident_pr),
                "created_at": resolution_pr.created_at.isoformat(),
                "updated_at": resolution_pr.updated_at.isoformat(),
            },
            incident_type=IncidentType.REVERT_PR,
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
                deployment_incidents_map[current_deployment] = (
                    current_deployment_incidents
                )
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
        self, team_id: str, interval: Interval, pr_filter: PRFilter
    ) -> MeanTimeToRecoveryMetrics:

        resolved_team_incidents = self.get_resolved_team_incidents(
            team_id, interval, pr_filter
        )

        return self._get_incidents_mean_time_to_recovery(resolved_team_incidents)

    def get_team_mean_time_to_recovery_trends(
        self, team_id: str, interval: Interval, pr_filter: PRFilter
    ) -> MeanTimeToRecoveryMetrics:

        resolved_team_incidents = self.get_resolved_team_incidents(
            team_id, interval, pr_filter
        )

        return self._get_incidents_mean_time_to_recovery_trends(
            resolved_team_incidents, interval
        )

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

    def _get_incidents_mean_time_to_recovery_trends(
        self, resolved_incidents: List[Incident], interval: Interval
    ) -> Dict[datetime, MeanTimeToRecoveryMetrics]:

        weekly_resolved_team_incidents: Dict[datetime, List[Incident]] = (
            generate_expanded_buckets(
                resolved_incidents, interval, "resolved_date", "weekly"
            )
        )

        weekly_mean_time_to_recovery: Dict[datetime, MeanTimeToRecoveryMetrics] = {}

        for week, incidents in weekly_resolved_team_incidents.items():

            if incidents:
                weekly_mean_time_to_recovery[week] = (
                    self._get_incidents_mean_time_to_recovery(incidents)
                )
            else:
                weekly_mean_time_to_recovery[week] = MeanTimeToRecoveryMetrics()

        return weekly_mean_time_to_recovery


def get_incident_service():
    return IncidentService(
        IncidentsRepoService(), get_settings_service(), CodeRepoService()
    )
