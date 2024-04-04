from dataclasses import dataclass
from operator import and_
from typing import List, Dict

from sqlalchemy import or_

from .workflows import RepoWorkflowRuns, RepoWorkflow


class RepoWorkflowFilter:
    def __init__(self, repo_id: str, repo_filters=None):
        if repo_filters is None:
            repo_filters = {}
        self.repo_id = repo_id
        self.head_branches = repo_filters.get("head_branches", [])

    @property
    def filter_query(self):
        def _repo_id_query():
            if not self.repo_id:
                raise ValueError("repo_id is required")
            return RepoWorkflow.org_repo_id == self.repo_id

        def _head_branches_query():
            if not self.head_branches:
                return None
            return or_(
                RepoWorkflowRuns.head_branch.op("~")(term)
                for term in self.head_branches
                if term is not None
            )

        conditions = {
            "repo_id": _repo_id_query(),
            "head_branches": _head_branches_query(),
        }
        queries = [
            conditions[x]
            for x in self.__dict__.keys()
            if getattr(self, x) is not None and conditions[x] is not None
        ]
        if not queries:
            return None
        return and_(*queries)


@dataclass
class WorkflowFilter:
    head_branches: List[str] = None
    repo_filters: Dict[str, Dict] = None

    @property
    def filter_query(self) -> List:
        def _head_branches_query():
            if not self.head_branches:
                return None

            return or_(
                RepoWorkflowRuns.head_branch.op("~")(term)
                for term in self.head_branches
            )

        def _repo_filters_query():
            if not self.repo_filters:
                return None

            return or_(
                RepoWorkflowFilter(repo_id, repo_filters).filter_query
                for repo_id, repo_filters in self.repo_filters.items()
                if repo_filters
            )

        conditions = {
            "head_branches": _head_branches_query(),
            "repo_filters": _repo_filters_query(),
        }
        return [
            conditions[x]
            for x in self.__dict__.keys()
            if getattr(self, x) is not None and conditions[x] is not None
        ]
