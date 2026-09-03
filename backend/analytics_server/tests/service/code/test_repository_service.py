from uuid import uuid4

from mhq.service.code.models.org_repo import RawTeamOrgRepo
from mhq.service.code.repository_service import RepositoryService
from mhq.store.models.code import CodeProvider, OrgRepo
from mhq.store.models.code.enums import TeamReposDeploymentType


class FakeCodeRepoService:
    def __init__(self, existing_repos=None):
        self._existing = existing_repos or []
        self.lookup_calls = []
        self.saved = None

    def get_repos_by_idempotency_keys(self, org_id, idempotency_keys):
        self.lookup_calls.append((str(org_id), list(idempotency_keys)))
        return [r for r in self._existing if str(r.org_id) == str(org_id)]

    def update_org_repos(self, org_repos):
        self.saved = org_repos
        return org_repos


def _raw_repo(idempotency_key="1030593440", name="urban-assembly"):
    return RawTeamOrgRepo(
        team_id=str(uuid4()),
        provider=CodeProvider.GITHUB,
        name=name,
        org_name="Clustox",
        slug=name,
        idempotency_key=idempotency_key,
        default_branch="main",
        deployment_type=TeamReposDeploymentType.PR_MERGE,
    )


def _service(code_repo_service):
    return RepositoryService(code_repo_service, incident_repo_service=None)


def test_the_lookup_is_scoped_to_the_org():
    # CLUSTOX: the lookup used to be global -- upstream's own ToDo. A GitHub
    # repo id is the same string no matter which workspace links the repo, so
    # a global lookup found the OTHER workspace's row and update_org_repos
    # raised "Data integrity error, matching idempotency key across orgs":
    # a permanent 500 on team save for the second workspace, specific to
    # exactly the repos another workspace already tracks.
    org_id = str(uuid4())
    fake = FakeCodeRepoService()

    _service(fake).update_org_repos(org_id, [_raw_repo()])

    assert fake.lookup_calls == [(org_id, ["1030593440"])]


def test_a_repo_tracked_by_another_workspace_gets_its_own_row():
    my_org = str(uuid4())
    other_org = str(uuid4())
    other_orgs_row = OrgRepo(
        id=str(uuid4()),
        org_id=other_org,
        name="urban-assembly",
        provider=CodeProvider.GITHUB.value,
        org_name="Clustox",
        idempotency_key="1030593440",
        slug="urban-assembly",
    )
    fake = FakeCodeRepoService(existing_repos=[other_orgs_row])

    _service(fake).update_org_repos(my_org, [_raw_repo()])

    # No exception, and a NEW row for this org -- never the other org's row.
    assert len(fake.saved) == 1
    saved = fake.saved[0]
    assert str(saved.org_id) == my_org
    assert saved.idempotency_key == "1030593440"
    assert str(saved.id) != str(other_orgs_row.id)


def test_an_existing_row_in_the_same_org_is_updated_in_place():
    org_id = str(uuid4())
    existing = OrgRepo(
        id=str(uuid4()),
        org_id=org_id,
        name="old-name",
        provider=CodeProvider.GITHUB.value,
        org_name="Clustox",
        idempotency_key="1030593440",
        slug="old-name",
        is_active=False,
    )
    fake = FakeCodeRepoService(existing_repos=[existing])

    _service(fake).update_org_repos(org_id, [_raw_repo()])

    assert len(fake.saved) == 1
    saved = fake.saved[0]
    assert str(saved.id) == str(existing.id)
    assert saved.is_active is True
    assert saved.name == "urban-assembly"
