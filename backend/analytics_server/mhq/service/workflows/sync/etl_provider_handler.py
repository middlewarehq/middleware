from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Tuple

from mhq.store.models.code import (
    OrgRepo,
    RepoWorkflow,
    RepoWorkflowRuns,
)


class WorkflowProviderETLHandler(ABC):
    @abstractmethod
    def check_pat_validity(self) -> bool:
        """
        This method checks if the PAT is valid.
        :return: PAT details
        :raises: Exception if PAT is invalid
        """

    @abstractmethod
    def get_workflow_runs(
        self,
        org_repo: OrgRepo,
        repo_workflow: RepoWorkflow,
        bookmark: datetime,
    ) -> Tuple[List[RepoWorkflowRuns], datetime]:
        """
        This method returns all workflow runs of a repo's workflow. After the bookmark date.
        :param org_repo: OrgRepo object to get workflow runs for
        :param repo_workflow: RepoWorkflow object to get workflow runs for
        :param bookmark: datetime object to get all workflow runs after this date
        :return: List of RepoWorkflowRuns objects, datetime object
        """
