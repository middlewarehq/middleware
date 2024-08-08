from typing import Dict, List
from mhq.store.models.code.enums import TeamReposDeploymentType
from mhq.store.models.incidents.services import TeamIncidentService
from mhq.store.repos.incidents import IncidentsRepoService
from mhq.store.models.incidents import OrgIncidentService, IncidentSource
from mhq.utils.time import time_now
from mhq.utils.string import uuid4_str
from mhq.service.code.models.org_repo import RawTeamOrgRepo
from mhq.store.models.code import OrgRepo
from mhq.store.models.core import Team
from mhq.store.repos.code import CodeRepoService, TeamRepos


class RepositoryService:
    def __init__(
        self,
        code_repo_service: CodeRepoService,
        incident_repo_service: IncidentsRepoService,
    ):
        self._code_repo_service = code_repo_service
        self._incident_repo_service = incident_repo_service

    def get_team_repos(self, team: Team) -> List[OrgRepo]:
        return self._code_repo_service.get_team_repos(team_id=str(team.id))

    def get_team_repos_by_team(self, team: Team) -> List[TeamRepos]:
        return self._code_repo_service.get_team_repos_by_team_id(team_id=str(team.id))

    def get_active_team_repos_by_team_id(self, team_id: str) -> List[TeamRepos]:
        return self._code_repo_service.get_active_team_repos_by_team_id(team_id)

    def get_active_org_repos_by_ids(self, repo_ids: List[str]) -> List[OrgRepo]:
        return self._code_repo_service.get_active_org_repos_by_ids(repo_ids)

    def get_repo_id_team_repos_map(
        self, team: Team, org_repos: List[OrgRepo]
    ) -> Dict[str, TeamRepos]:
        repo_ids = [str(repo.id) for repo in org_repos]
        team_repos: List[TeamRepos] = (
            self._code_repo_service.get_team_repos_by_repo_id_for_team(
                team.id, repo_ids
            )
        )

        return {str(repo.org_repo_id): repo for repo in team_repos}

    def update_team_repos(
        self, team: Team, raw_org_repos: List[RawTeamOrgRepo]
    ) -> List[OrgRepo]:

        updated_repos = self.update_org_repos(team.org_id, raw_org_repos)
        self._update_team_repos(team, updated_repos, raw_org_repos)
        self.set_unused_repos_as_inactive(team.org_id)
        self._update_team_incident_services(team, updated_repos)

        return updated_repos

    def _update_team_repos(
        self,
        team: Team,
        updated_org_repos: List[OrgRepo],
        raw_repos_data: List[RawTeamOrgRepo],
    ):
        existing_team_repos = self._code_repo_service.get_existing_team_repos(team)
        for team_repo in existing_team_repos:
            team_repo.is_active = False

        repo_id_to_team_repos_map = {
            str(team_repo.org_repo_id): team_repo for team_repo in existing_team_repos
        }

        idempotency_key_raw_org_repo_map = {
            str(repo.idempotency_key): repo for repo in raw_repos_data
        }

        updated_team_repos = []
        for repo in updated_org_repos:
            team_repo = repo_id_to_team_repos_map.get(str(repo.id))
            raw_org_repo = idempotency_key_raw_org_repo_map.get(repo.idempotency_key)
            if team_repo:
                team_repo.is_active = True
                team_repo.deployment_type = (
                    raw_org_repo.deployment_type
                    if raw_org_repo
                    else team_repo.deployment_type
                )
            else:
                team_repo = TeamRepos(
                    team_id=team.id,
                    org_repo_id=str(repo.id),
                    prod_branches=(
                        ["^" + repo.default_branch + "$"]
                        if repo.default_branch
                        else None
                    ),
                    deployment_type=(
                        raw_org_repo.deployment_type
                        if raw_org_repo
                        else TeamReposDeploymentType.PR_MERGE
                    ),
                )

            updated_team_repos.append(team_repo)

        self._code_repo_service.update_team_repos(updated_team_repos)

    def set_unused_repos_as_inactive(self, org_id: str) -> List[OrgRepo]:

        active_repos = self._code_repo_service.get_active_org_repos(org_id)
        active_repos_used_across_teams = (
            self._code_repo_service.get_org_repos_used_across_teams(org_id)
        )

        active_team_repo_ids = set(
            [str(repo.id) for repo in active_repos_used_across_teams]
        )

        for repo in active_repos:
            if str(repo.id) not in active_team_repo_ids:
                repo.is_active = False

        return self._code_repo_service.update_org_repos(active_repos)

    def update_org_repos(
        self, org_id: str, raw_org_repos: List[RawTeamOrgRepo]
    ) -> List[OrgRepo]:

        idempotency_keys = [repo.idempotency_key for repo in raw_org_repos]

        existing_org_repos = self._code_repo_service.get_repos_by_idempotency_keys(
            idempotency_keys
        )

        updated_org_repos = []
        idempotency_key_to_repo_map = {
            repo.idempotency_key: repo for repo in existing_org_repos
        }

        for raw_org_repo in raw_org_repos:

            existing_org_repo = idempotency_key_to_repo_map.get(
                raw_org_repo.idempotency_key
            )
            if existing_org_repo:

                # ToDo update idempotency key to idempotency_key, provider, org.
                if str(existing_org_repo.org_id) != str(org_id):
                    raise Exception(
                        f"Data integrity error, matching idempotency key across orgs. Team OrgId: {str(org_id)}. Existing Repo OrgID: {str(existing_org_repo.org_id)}. idempotency_key: {raw_org_repo.idempotency_key}"
                    )

                existing_org_repo.is_active = True
                existing_org_repo.slug = raw_org_repo.slug
                existing_org_repo.name = raw_org_repo.name

                updated_org_repos.append(existing_org_repo)

            else:
                updated_org_repos.append(
                    OrgRepo(
                        id=uuid4_str(),
                        org_id=org_id,
                        name=raw_org_repo.name,
                        provider=raw_org_repo.provider.value,
                        org_name=raw_org_repo.org_name,
                        idempotency_key=raw_org_repo.idempotency_key,
                        slug=raw_org_repo.slug,
                        default_branch=raw_org_repo.default_branch,
                    )
                )

        return self._code_repo_service.update_org_repos(updated_org_repos)

    def patch_team_repos_mapping(self, team: Team, team_repos: List[TeamRepos]):

        existing_team_repos = self.get_team_repos(team)

        existing_team_repo_ids = set([str(repo.id) for repo in existing_team_repos])

        team_repo_ids = set([str(repo.org_repo_id) for repo in team_repos])

        team_repos_mappings_not_in_db = list(
            team_repo_ids.difference(existing_team_repo_ids)
        )

        if team_repos_mappings_not_in_db:
            raise Exception(
                f"Team Repo Mappings does not exist for team: {str(team.id)} and repos {team_repos_mappings_not_in_db}"
            )

        return self._code_repo_service.patch_team_repos_mapping(team, team_repos)

    def _update_team_incident_services(self, team: Team, org_repos: List[OrgRepo]):

        incident_services = self._update_org_incident_services(team.org_id, org_repos)

        new_team_services = []
        remove_team_services = []

        curr_team_services = self._incident_repo_service.get_team_incident_services(
            team
        )

        curr_team_services_map = {
            str(team_service.service_id): team_service
            for team_service in curr_team_services
        }

        service_ids = [str(service.id) for service in incident_services]

        for team_service in curr_team_services:
            if str(team_service.service_id) not in service_ids:
                remove_team_services.append(team_service)

        for service_id in service_ids:
            if service_id not in curr_team_services_map:
                new_team_services.append(
                    TeamIncidentService(
                        team_id=team.id,
                        service_id=service_id,
                        created_at=time_now(),
                        updated_at=time_now(),
                    )
                )
        self._incident_repo_service.add_team_incident_services(new_team_services)
        self._incident_repo_service.delete_team_incident_services(remove_team_services)

    def _update_org_incident_services(
        self, org_id: str, org_repos: List[OrgRepo]
    ) -> List[OrgIncidentService]:
        org_repo_ids = [str(org_repo.id) for org_repo in org_repos]
        incident_services = self._incident_repo_service.get_org_incident_services(
            org_id, IncidentSource.GIT_REPO, org_repo_ids
        )

        key_to_incident_service_map = {
            incident_service.key: incident_service
            for incident_service in incident_services
        }

        updated_incident_services = []

        for repo in org_repos:

            repo_id = str(repo.id)
            incident_service = self._adapt_org_incident_service(
                repo, key_to_incident_service_map.get(repo_id)
            )
            updated_incident_services.append(incident_service)

        return self._incident_repo_service.update_org_incident_services(
            updated_incident_services
        )

    def _adapt_org_incident_service(
        self,
        org_repo: OrgRepo,
        org_incident_service: OrgIncidentService = None,
    ) -> OrgIncidentService:

        return OrgIncidentService(
            id=org_incident_service.id if org_incident_service else uuid4_str(),
            org_id=org_repo.org_id,
            provider=org_repo.provider,
            name=org_repo.name,
            key=str(org_repo.id),
            meta={},
            created_at=(
                org_incident_service.created_at if org_incident_service else time_now()
            ),
            updated_at=time_now(),
            source_type=IncidentSource.GIT_REPO,
        )


def get_repository_service():
    return RepositoryService(CodeRepoService(), IncidentsRepoService())
