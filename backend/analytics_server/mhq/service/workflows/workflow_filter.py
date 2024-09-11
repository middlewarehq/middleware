import json

from typing import List, Dict


from mhq.store.models.code.workflows.filter import WorkflowFilter


class ParseWorkflowFilterProcessor:
    def apply(self, workflow_filter: Dict = None) -> WorkflowFilter:
        head_branches: List[str] = self._parse_head_branches(workflow_filter)
        repo_filters: Dict[str, Dict] = self._parse_repo_filters(workflow_filter)

        return WorkflowFilter(
            head_branches=head_branches,
            repo_filters=repo_filters,
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
