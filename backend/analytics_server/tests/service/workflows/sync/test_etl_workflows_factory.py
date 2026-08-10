from unittest.mock import patch

import pytest

from mhq.service.workflows.sync.etl_workflows_factory import WorkflowETLFactory
from mhq.store.models.code import RepoWorkflowProviders
from mhq.store.repos.core import CoreRepoService


def test_jenkins_is_a_known_provider():
    assert RepoWorkflowProviders.JENKINS.value == "jenkins"


def test_factory_rejects_unknown_provider():
    factory = WorkflowETLFactory("org-id")
    with pytest.raises(NotImplementedError):
        factory("NOT_A_PROVIDER")


def test_factory_returns_a_jenkins_handler():
    from mhq.service.workflows.sync.etl_jenkins_handler import JenkinsETLHandler

    # CLUSTOX: get_jenkins_etl_handler resolves credentials through
    # CoreRepoService, which needs a live Flask app context / DB session that
    # this test suite does not provide (no conftest.py sets one up, and no
    # other test in the suite calls CoreRepoService without mocking it either
    # -- see tests/clustox_auth/test_sync_run.py). Mocking these two methods
    # also exercises exactly the "unconfigured org" path described by the
    # correctness requirement: the factory must still hand back a handler
    # instead of raising when Jenkins isn't set up for this org.
    with patch.object(
        CoreRepoService, "get_access_token", return_value=None
    ), patch.object(CoreRepoService, "get_org_integrations_for_names", return_value=[]):
        factory = WorkflowETLFactory("org-id")
        handler = factory(RepoWorkflowProviders.JENKINS.name)

    assert isinstance(handler, JenkinsETLHandler)
