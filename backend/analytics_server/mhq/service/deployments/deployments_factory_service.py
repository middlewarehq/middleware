from abc import ABC, abstractmethod
from typing import List, Dict, Tuple
from urllib.parse import unquote
from mhq.store.models.code.pull_requests import PullRequest
from uuid import UUID
from werkzeug.exceptions import BadRequest

from mhq.store.models.code.repository import TeamRepos
from mhq.service.deployments.models.models import Deployment, DeploymentType


class DeploymentsFactoryService(ABC):
    @abstractmethod
    def get_repos_successful_deployments_in_interval(
        self, repo_ids, interval, specific_filter
    ) -> List[Deployment]:
        pass

    @abstractmethod
    def get_repos_all_deployments_in_interval(
        self, repo_ids, interval, specific_filter
    ) -> List[Deployment]:
        pass

    @abstractmethod
    def get_pull_requests_related_to_deployment(
        self, deployment: Deployment
    ) -> List[PullRequest]:
        pass

    @abstractmethod
    def get_deployment_by_entity_id(self, entity_id: str) -> Deployment:
        pass

    @classmethod
    def get_deployment_type_and_entity_id_from_deployment_id(
        cls, id_str: str
    ) -> Tuple[DeploymentType, str]:
        id_str = unquote(id_str)
        # Split the id string by '|'
        deployment_type, entity_id = id_str.split("|")
        try:
            UUID(entity_id)
        except ValueError:
            raise BadRequest(f"Invalid UUID entity id: {entity_id}")
        return DeploymentType(deployment_type), entity_id
