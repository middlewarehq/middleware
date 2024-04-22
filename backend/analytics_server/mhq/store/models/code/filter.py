from dataclasses import dataclass
from typing import List, Dict

from sqlalchemy import and_, or_

from mhq.store.models.code.pull_requests import PullRequest


@dataclass
class PRFilter:
    authors: List[str] = None
    base_branches: List[str] = None
    repo_filters: Dict[str, Dict] = None
    excluded_pr_ids: List[str] = None
    max_cycle_time: int = None

    class RepoFilter:
        def __init__(self, repo_id: str, repo_filters=None):
            if repo_filters is None:
                repo_filters = {}
            self.repo_id = repo_id
            self.base_branches = repo_filters.get("base_branches", [])

        @property
        def filter_query(self):
            def _repo_id_query():
                if not self.repo_id:
                    raise ValueError("repo_id is required")
                return PullRequest.repo_id == self.repo_id

            def _base_branch_query():
                if not self.base_branches:
                    return None
                return or_(
                    PullRequest.base_branch.op("~")(term)
                    for term in self.base_branches
                    if term is not None
                )

            conditions = {
                "repo_id": _repo_id_query(),
                "base_branches": _base_branch_query(),
            }
            queries = [
                conditions[x]
                for x in self.__dict__.keys()
                if getattr(self, x) is not None and conditions[x] is not None
            ]
            if not queries:
                return None
            return and_(*queries)

    @property
    def filter_query(self) -> List:
        def _base_branch_query():
            if not self.base_branches:
                return None

            return or_(
                PullRequest.base_branch.op("~")(term) for term in self.base_branches
            )

        def _repo_filters_query():
            if not self.repo_filters:
                return None

            return or_(
                self.RepoFilter(repo_id, repo_filters).filter_query
                for repo_id, repo_filters in self.repo_filters.items()
                if repo_filters
            )

        def _excluded_pr_ids_query():
            if not self.excluded_pr_ids:
                return None

            return PullRequest.id.notin_(self.excluded_pr_ids)

        def _include_prs_below_max_cycle_time():
            if not self.max_cycle_time:
                return None

            return and_(
                PullRequest.cycle_time != None,
                PullRequest.cycle_time < self.max_cycle_time,
            )

        conditions = {
            "base_branches": _base_branch_query(),
            "repo_filters": _repo_filters_query(),
            "excluded_pr_ids": _excluded_pr_ids_query(),
            "max_cycle_time": _include_prs_below_max_cycle_time(),
        }
        return [
            conditions[x]
            for x in self.__dict__.keys()
            if getattr(self, x) is not None and conditions[x] is not None
        ]
