from collections import defaultdict
from datetime import datetime
from queue import Queue
from typing import List
from mhq.store.models.code.enums import PullRequestState

from mhq.store.models.code.pull_requests import PullRequest
from mhq.service.deployments.models.models import Deployment


class DeploymentPRGraph:
    def __init__(self):
        self._nodes = set()
        self._adj_list = defaultdict(list)
        self._last_change_deployed_for_branch = {}

    def add_edge(self, base_branch, head_branch, pr: PullRequest):
        self._nodes.add(base_branch)

        self._adj_list[base_branch].append((head_branch, pr))
        if head_branch not in self._last_change_deployed_for_branch:
            self._last_change_deployed_for_branch[head_branch] = pr.state_changed_at

        self._last_change_deployed_for_branch[head_branch] = max(
            self._last_change_deployed_for_branch[head_branch], pr.state_changed_at
        )

    def get_edges(self, base_branch: str):
        return self._adj_list[base_branch]

    def get_all_prs_for_root(self, base_branch) -> List[PullRequest]:
        if base_branch not in self._nodes:
            return []

        prs = set()
        q = Queue()
        visited = defaultdict(bool)
        q.put(base_branch)

        while not q.empty():
            front = q.get()
            if visited[front]:
                continue

            visited[front] = True
            for edge in self.get_edges(front):
                branch, pr = edge
                if self._is_pr_merged_post_last_change(pr=pr, base_branch=front):
                    continue

                q.put(branch)
                prs.add(pr)

        return list(prs)

    def _is_pr_merged_post_last_change(self, pr: PullRequest, base_branch: str):
        return pr.state_changed_at > self._last_change_deployed_for_branch[base_branch]

    def set_root_deployment_time(self, root_branch, deployment_time: datetime):
        self._last_change_deployed_for_branch[root_branch] = deployment_time


class DeploymentPRMapperService:
    def get_all_prs_deployed(
        self, prs: List[PullRequest], deployment: Deployment
    ) -> List[PullRequest]:

        branch_graph = DeploymentPRGraph()
        branch_graph.set_root_deployment_time(
            deployment.head_branch, deployment.conducted_at
        )

        for pr in prs:
            if pr.state != PullRequestState.MERGED:
                continue

            branch_graph.add_edge(pr.base_branch, pr.head_branch, pr)

        return branch_graph.get_all_prs_for_root(deployment.head_branch)
