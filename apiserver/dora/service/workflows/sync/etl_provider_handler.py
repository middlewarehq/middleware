from abc import ABC, abstractmethod
from typing import List

from dora.store.models.code import (
    OrgRepo,
    RepoWorkflow,
    RepoWorkflowRunsBookmark,
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
        pass

    @abstractmethod
    def get_workflow_runs(
        self,
        org_repo: OrgRepo,
        repo_workflow: RepoWorkflow,
        bookmark: RepoWorkflowRunsBookmark,
    ) -> List[RepoWorkflowRuns]:
        """
        This method returns all workflow runs of a repo's workflow. After the bookmark date.
        :param org_repo: OrgRepo object to get workflow runs for
        :param repo_workflow: RepoWorkflow object to get workflow runs for
        :param bookmark: Bookmark object to get all workflow runs after this date
        :return: List of RepoWorkflowRuns objects
        """
        pass
