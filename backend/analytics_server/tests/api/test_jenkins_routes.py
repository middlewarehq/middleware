from mhq.api.integrations import deactivate_github_actions_workflows_for_repo
from mhq.store.models.code import RepoWorkflowProviders


class FakeWorkflow:
    def __init__(self, provider, is_active=True):
        self.provider = provider
        self.is_active = is_active


def test_deactivates_only_github_actions_workflows():
    workflows = [
        FakeWorkflow(RepoWorkflowProviders.GITHUB_ACTIONS),
        FakeWorkflow(RepoWorkflowProviders.GITHUB_ACTIONS),
        FakeWorkflow(RepoWorkflowProviders.JENKINS),
    ]

    count = deactivate_github_actions_workflows_for_repo(workflows)

    assert count == 2
    assert [w.is_active for w in workflows] == [False, False, True]


def test_deactivating_is_idempotent():
    workflows = [FakeWorkflow(RepoWorkflowProviders.GITHUB_ACTIONS, is_active=False)]

    count = deactivate_github_actions_workflows_for_repo(workflows)

    # Already inactive, so nothing changed and nothing is reported.
    assert count == 0
