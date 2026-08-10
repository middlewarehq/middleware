import pytest

from mhq.service.workflows.sync.etl_workflows_factory import WorkflowETLFactory
from mhq.store.models.code import RepoWorkflowProviders


def test_jenkins_is_a_known_provider():
    assert RepoWorkflowProviders.JENKINS.value == "jenkins"


def test_factory_rejects_unknown_provider():
    factory = WorkflowETLFactory("org-id")
    with pytest.raises(NotImplementedError):
        factory("NOT_A_PROVIDER")
