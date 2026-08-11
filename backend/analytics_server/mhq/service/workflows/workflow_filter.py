import json

from typing import List, Dict


from mhq.store.models.code.workflows.filter import WorkflowFilter


class ParseWorkflowFilterProcessor:
    def apply(self, workflow_filter: Dict = None) -> WorkflowFilter:
        # CLUSTOX: contributor filter for deployment frequency. This guard is a
        # behaviour change, not just an addition: upstream dereferenced the
        # argument straight away, so `apply(None)` raised AttributeError even
        # though the signature defaults to None. Making the documented default
        # actually work is what lets the event_actors lookup below be
        # unconditional.
        workflow_filter = workflow_filter or {}
        # END CLUSTOX
        head_branches: List[str] = self._parse_head_branches(workflow_filter)
        repo_filters: Dict[str, Dict] = self._parse_repo_filters(workflow_filter)
        # CLUSTOX: contributor filter -- the actor who triggered the run. Read
        # from inside the workflow_filter blob, the same level as head_branches.
        event_actors: List[str] = workflow_filter.get("event_actors")
        # END CLUSTOX

        return WorkflowFilter(
            head_branches=head_branches,
            repo_filters=repo_filters,
            # CLUSTOX: contributor filter for deployment frequency.
            event_actors=event_actors,
            # END CLUSTOX
        )

    def _parse_head_branches(self, workflow_filter: Dict) -> List[str]:
        return workflow_filter.get("head_branches")

    def _parse_repo_filters(self, workflow_filter: Dict) -> Dict[str, Dict]:
        repo_filters: Dict[str, Dict] = workflow_filter.get("repo_filters")
        if repo_filters:
            for repo_id, repo_filter in repo_filters.items():
                repo_head_branches: List[str] = self._parse_repo_head_branches(
                    repo_filter
                )
                repo_filters[repo_id]["head_branches"] = repo_head_branches
        return repo_filters

    def _parse_repo_head_branches(self, repo_filter: Dict[str, any]) -> List[str]:
        repo_head_branches: List[str] = repo_filter.get("head_branches")
        if not repo_head_branches:
            return []
        return repo_head_branches


class WorkflowFilterProcessor:
    def __init__(self, parse_workflow_filter_processor: ParseWorkflowFilterProcessor):
        self.parse_workflow_filter_processor = parse_workflow_filter_processor

    def create_workflow_filter_from_json_string(
        self, filter_data: str
    ) -> WorkflowFilter:
        filter_data = filter_data or "{}"
        return self.parse_workflow_filter_processor.apply(json.loads(filter_data))


def get_workflow_filter_processor() -> WorkflowFilterProcessor:
    return WorkflowFilterProcessor(ParseWorkflowFilterProcessor())
