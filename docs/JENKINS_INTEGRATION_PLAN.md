# Jenkins Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jenkins builds are recorded as deployments so Deployment Frequency and Lead Time reflect how teams actually ship.

**Architecture:** A pull adapter implementing the existing two-method `WorkflowProviderETLHandler` contract. Nothing downstream changes — metric computation reads `RepoWorkflowRuns` and never asks which provider produced a run. Credentials reuse the `Integration` table; job-to-repo mapping is manual and doubles as designating a job a deployment.

**Tech Stack:** Python 3.9, Flask, SQLAlchemy 2, pytest (backend); Next.js 15 pages router, TypeScript, MUI 5, Playwright (frontend).

**Design spec:** `docs/JENKINS_INTEGRATION.md`. Read it before starting.

## Global Constraints

- **No database migration.** `RepoWorkflow.provider` is `character varying`; the schema declares no Postgres enum types. Adding a provider is a code change only.
- **No new tables.** Credentials go in `Integration` (`access_token_enc_chunks` + `provider_meta`); mappings are `RepoWorkflow` rows.
- **TLS verification is always on.** No skip-verify option. Do not add one.
- **All HTTP calls to Jenkins carry explicit timeouts** — `(5, 30)` connect/read. The workspace sync loop is sequential; an untimed request stalls every workspace behind it.
- **Bookmark advances only after a successful persist.** On any error, return the incoming bookmark unchanged.
- Backend style: `black` formatted, `flake8` clean. Frontend: `tsc` clean.
- Every Clustox-authored change carries a `# CLUSTOX:` or `// CLUSTOX:` comment explaining why, per `docs/FORK_STRATEGY.md`.

---

## File Structure

**Backend — create:**
- `mhq/exapi/jenkins.py` — HTTP client. Knows Jenkins' REST shape, knows nothing about our models.
- `mhq/service/workflows/sync/etl_jenkins_handler.py` — ETL handler. Maps Jenkins JSON to `RepoWorkflowRuns`.
- `mhq/utils/jenkins.py` — reads base URL and username out of `Integration.provider_meta`.
- `tests/factories/models/exapi/jenkins.py` — build fixtures.
- `tests/service/workflows/sync/test_etl_jenkins_handler.py` — handler tests.
- `tests/exapi/test_jenkins.py` — client tests.

**Backend — modify:**
- `mhq/store/models/code/workflows/enums.py` — add `JENKINS`.
- `mhq/store/models/integrations/enums.py` — add `JENKINS` to `UserIdentityProvider`.
- `mhq/service/workflows/sync/etl_workflows_factory.py` — register the handler.

**Frontend — create:**
- `web-server/pages/api/clustox/jenkins/jobs.ts` — list jobs.
- `web-server/pages/api/clustox/jenkins/mappings.ts` — create/delete mappings.
- `web-server/src/components/ClustoxJenkinsSetup.tsx` — credentials form.
- `web-server/src/components/ClustoxJenkinsMapping.tsx` — job-to-repo table.
- `web-server/e2e/jenkins.spec.ts` — isolation tests.

**Frontend — modify:**
- `web-server/src/constants/integrations.ts` — add `JENKINS`.
- `web-server/pages/integrations.tsx` — render the Jenkins card.

---

### Task 1: Register Jenkins as a provider

**Files:**
- Modify: `backend/analytics_server/mhq/store/models/code/workflows/enums.py`
- Modify: `backend/analytics_server/mhq/store/models/integrations/enums.py`
- Test: `backend/analytics_server/tests/service/workflows/sync/test_etl_workflows_factory.py` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: `RepoWorkflowProviders.JENKINS` (value `"jenkins"`), `UserIdentityProvider.JENKINS` (value `"jenkins"`).

- [ ] **Step 1: Write the failing test**

Create `backend/analytics_server/tests/service/workflows/sync/test_etl_workflows_factory.py`:

```python
import pytest

from mhq.service.workflows.sync.etl_workflows_factory import WorkflowETLFactory
from mhq.store.models.code import RepoWorkflowProviders


def test_jenkins_is_a_known_provider():
    assert RepoWorkflowProviders.JENKINS.value == "jenkins"


def test_factory_rejects_unknown_provider():
    factory = WorkflowETLFactory("org-id")
    with pytest.raises(NotImplementedError):
        factory("NOT_A_PROVIDER")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/analytics_server && python -m pytest tests/service/workflows/sync/test_etl_workflows_factory.py -v`
Expected: FAIL with `AttributeError: JENKINS`

- [ ] **Step 3: Add the enum values**

In `mhq/store/models/code/workflows/enums.py`, inside `RepoWorkflowProviders`:

```python
class RepoWorkflowProviders(Enum):
    GITHUB_ACTIONS = "github"
    CIRCLE_CI = "circle_ci"
    # CLUSTOX: Jenkins as a deployment source. Persisted as varchar, so no
    # migration is required despite the ENUM() wrapper on the column.
    JENKINS = "jenkins"
```

In `mhq/store/models/integrations/enums.py`, inside `UserIdentityProvider`:

```python
class UserIdentityProvider(Enum):
    GITHUB = "github"
    GITLAB = "gitlab"
    # CLUSTOX: Jenkins credentials live in Integration like any other provider.
    JENKINS = "jenkins"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend/analytics_server && python -m pytest tests/service/workflows/sync/test_etl_workflows_factory.py -v`
Expected: PASS (both tests)

- [ ] **Step 5: Commit**

```bash
git add backend/analytics_server/mhq/store/models/code/workflows/enums.py \
        backend/analytics_server/mhq/store/models/integrations/enums.py \
        backend/analytics_server/tests/service/workflows/sync/test_etl_workflows_factory.py
git commit -m "feat(jenkins): register jenkins as a workflow and identity provider"
```

---

### Task 2: Jenkins API client

**Files:**
- Create: `backend/analytics_server/mhq/exapi/jenkins.py`
- Test: `backend/analytics_server/tests/exapi/test_jenkins.py`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `JenkinsApiService(base_url: str, username: str, api_token: str, timeout: Tuple[int, int] = (5, 30))`
  - `.check_pat() -> bool`
  - `.get_jobs() -> List[Dict]` — each `{"name": str, "full_name": str, "url": str}`
  - `.get_builds(job_full_name: str, bookmark: datetime) -> List[Dict]` — raw Jenkins build dicts, newest first, only those with `timestamp` after `bookmark`
  - `job_path(job_full_name: str) -> str` — module-level helper

- [ ] **Step 1: Write the failing test**

Create `backend/analytics_server/tests/exapi/test_jenkins.py`:

```python
from datetime import datetime

import pytz

from mhq.exapi.jenkins import JenkinsApiService, job_path


def test_job_path_encodes_a_top_level_job():
    assert job_path("deploy-api") == "job/deploy-api"


def test_job_path_encodes_a_folder_job():
    # Jenkins addresses nested jobs by repeating /job/ per segment.
    assert job_path("platform/deploy-api") == "job/platform/job/deploy-api"


def test_get_builds_filters_out_builds_at_or_before_the_bookmark():
    class FakeResponse:
        status_code = 200

        @staticmethod
        def json():
            return {
                "builds": [
                    {"number": 3, "timestamp": 3000, "result": "SUCCESS"},
                    {"number": 2, "timestamp": 2000, "result": "SUCCESS"},
                    {"number": 1, "timestamp": 1000, "result": "SUCCESS"},
                ]
            }

        @staticmethod
        def raise_for_status():
            return None

    service = JenkinsApiService("https://jenkins.example.com", "user", "token")
    service._get = lambda path: FakeResponse()

    bookmark = datetime.fromtimestamp(2, tz=pytz.UTC)
    builds = service.get_builds("deploy-api", bookmark)

    assert [b["number"] for b in builds] == [3]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/analytics_server && python -m pytest tests/exapi/test_jenkins.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'mhq.exapi.jenkins'`

- [ ] **Step 3: Write the client**

Create `backend/analytics_server/mhq/exapi/jenkins.py`:

```python
# CLUSTOX: Jenkins REST client. Knows Jenkins' API shape and nothing about our
# models -- adaptation to RepoWorkflowRuns lives in the ETL handler.
from datetime import datetime
from typing import Dict, List, Tuple

import pytz
import requests

# Connect and read timeouts. The workspace sync loop is sequential, so an
# untimed request against a hung Jenkins stalls every workspace behind it.
DEFAULT_TIMEOUT: Tuple[int, int] = (5, 30)

# Fetched per build. Explicit rather than a wildcard so a Jenkins with many
# plugins does not return megabytes of action data per build.
BUILD_TREE = (
    "builds[number,result,timestamp,duration,url,building,"
    "actions[causes[userId,userName,shortDescription],"
    "lastBuiltRevision[SHA1,branch[name]]]]"
)

JOB_TREE = "jobs[name,fullName,url]"


def job_path(job_full_name: str) -> str:
    """Jenkins addresses nested jobs by repeating /job/ for each segment."""
    return "/".join(f"job/{segment}" for segment in job_full_name.split("/"))


class JenkinsApiService:
    def __init__(
        self,
        base_url: str,
        username: str,
        api_token: str,
        timeout: Tuple[int, int] = DEFAULT_TIMEOUT,
    ):
        self._base_url = base_url.rstrip("/")
        self._auth = (username, api_token)
        self._timeout = timeout

    def _get(self, path: str):
        # TLS verification is deliberately not configurable. A skip-verify
        # option is easy to add, hard to remove, and this connection carries an
        # API token.
        return requests.get(
            f"{self._base_url}/{path}",
            auth=self._auth,
            timeout=self._timeout,
            verify=True,
        )

    def check_pat(self) -> bool:
        response = self._get("api/json")
        return response.status_code == 200

    def get_jobs(self) -> List[Dict]:
        response = self._get(f"api/json?tree={JOB_TREE}")
        response.raise_for_status()
        return [
            {
                "name": job.get("name"),
                "full_name": job.get("fullName") or job.get("name"),
                "url": job.get("url"),
            }
            for job in response.json().get("jobs", [])
        ]

    def get_builds(self, job_full_name: str, bookmark: datetime) -> List[Dict]:
        response = self._get(f"{job_path(job_full_name)}/api/json?tree={BUILD_TREE}")
        response.raise_for_status()
        builds = response.json().get("builds", [])
        return [
            build
            for build in builds
            if self._build_time(build) and self._build_time(build) > bookmark
        ]

    @staticmethod
    def _build_time(build: Dict):
        timestamp = build.get("timestamp")
        if not timestamp:
            return None
        return datetime.fromtimestamp(timestamp / 1000, tz=pytz.UTC)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend/analytics_server && python -m pytest tests/exapi/test_jenkins.py -v`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/analytics_server/mhq/exapi/jenkins.py \
        backend/analytics_server/tests/exapi/test_jenkins.py
git commit -m "feat(jenkins): add REST client with bounded timeouts"
```

---

### Task 3: Build fixtures

**Files:**
- Create: `backend/analytics_server/tests/factories/models/exapi/jenkins.py`

**Interfaces:**
- Consumes: nothing.
- Produces: `get_jenkins_build_dict(**kwargs) -> Dict` — a realistic successful build with git plugin data; every field overridable by keyword.

- [ ] **Step 1: Write the fixture factory**

Create `backend/analytics_server/tests/factories/models/exapi/jenkins.py`:

```python
# CLUSTOX: recorded from a real Jenkins pipeline build. Shape matters more than
# values -- these encode the assumptions the handler makes about the API.
from typing import Dict


def get_jenkins_build_dict(
    number: int = 42,
    result: str = "SUCCESS",
    timestamp: int = 1754827200000,  # 2025-08-10T12:00:00Z
    duration: int = 125000,
    url: str = "https://jenkins.example.com/job/deploy-api/42/",
    building: bool = False,
    user_id: str = "hamad",
    branch_name: str = "origin/main",
    sha: str = "a1b2c3d4e5f6",
) -> Dict:
    return {
        "number": number,
        "result": result,
        "timestamp": timestamp,
        "duration": duration,
        "url": url,
        "building": building,
        "actions": [
            {"causes": [{"userId": user_id, "shortDescription": "Started by user"}]},
            {"lastBuiltRevision": {"SHA1": sha, "branch": [{"name": branch_name}]}},
        ],
    }


def get_jenkins_build_dict_without_git_plugin(**kwargs) -> Dict:
    """A freestyle job with no SCM: no branch, no revision, no user cause."""
    build = get_jenkins_build_dict(**kwargs)
    build["actions"] = [{}]
    return build
```

- [ ] **Step 2: Verify it imports**

Run: `cd backend/analytics_server && python -c "from tests.factories.models.exapi.jenkins import get_jenkins_build_dict; print(get_jenkins_build_dict()['number'])"`
Expected: prints `42`

- [ ] **Step 3: Commit**

```bash
git add backend/analytics_server/tests/factories/models/exapi/jenkins.py
git commit -m "test(jenkins): add build fixtures including the no-git-plugin case"
```

---

### Task 4: Jenkins ETL handler

**Files:**
- Create: `backend/analytics_server/mhq/service/workflows/sync/etl_jenkins_handler.py`
- Test: `backend/analytics_server/tests/service/workflows/sync/test_etl_jenkins_handler.py`

**Interfaces:**
- Consumes: `JenkinsApiService` (Task 2), `get_jenkins_build_dict` (Task 3), `RepoWorkflowProviders.JENKINS` (Task 1).
- Produces:
  - `JenkinsETLHandler(org_id: str, jenkins_api_service, workflow_repo_service)`
  - `._adapt_jenkins_build_to_workflow_run(repo_workflow_id: str, build: Dict) -> RepoWorkflowRuns`
  - `._get_repo_workflow_status(build: Dict) -> RepoWorkflowRunsStatus` (static)
  - `._get_datetime_from_epoch_ms(ms: int) -> datetime` (static)
  - `._get_branch(build: Dict) -> Optional[str]` (static)
  - `._get_actor(build: Dict) -> Optional[str]` (static)

- [ ] **Step 1: Write the failing tests**

Create `backend/analytics_server/tests/service/workflows/sync/test_etl_jenkins_handler.py`:

```python
from mhq.service.workflows.sync.etl_jenkins_handler import JenkinsETLHandler
from mhq.store.models.code import RepoWorkflowRunsStatus
from mhq.utils.string import uuid4_str
from tests.factories.models.exapi.jenkins import (
    get_jenkins_build_dict,
    get_jenkins_build_dict_without_git_plugin,
)


class FakeWorkflowRepoService:
    def get_repo_workflow_run_by_provider_workflow_run_id(self, *args):
        return None


def _handler():
    return JenkinsETLHandler(uuid4_str(), None, FakeWorkflowRepoService())


def test_success_maps_to_success():
    build = get_jenkins_build_dict(result="SUCCESS")
    assert (
        JenkinsETLHandler._get_repo_workflow_status(build)
        == RepoWorkflowRunsStatus.SUCCESS
    )


def test_failure_maps_to_failure():
    build = get_jenkins_build_dict(result="FAILURE")
    assert (
        JenkinsETLHandler._get_repo_workflow_status(build)
        == RepoWorkflowRunsStatus.FAILURE
    )


def test_aborted_maps_to_cancelled():
    build = get_jenkins_build_dict(result="ABORTED")
    assert (
        JenkinsETLHandler._get_repo_workflow_status(build)
        == RepoWorkflowRunsStatus.CANCELLED
    )


def test_unstable_maps_to_failure_so_it_is_not_counted_as_a_deployment():
    build = get_jenkins_build_dict(result="UNSTABLE")
    assert (
        JenkinsETLHandler._get_repo_workflow_status(build)
        == RepoWorkflowRunsStatus.FAILURE
    )


def test_a_running_build_maps_to_pending():
    build = get_jenkins_build_dict(result=None, building=True)
    assert (
        JenkinsETLHandler._get_repo_workflow_status(build)
        == RepoWorkflowRunsStatus.PENDING
    )


def test_adapt_maps_every_field():
    build = get_jenkins_build_dict()
    repo_workflow_id = uuid4_str()

    run = _handler()._adapt_jenkins_build_to_workflow_run(repo_workflow_id, build)

    assert run.repo_workflow_id == repo_workflow_id
    assert run.provider_workflow_run_id == "42"
    assert run.status == RepoWorkflowRunsStatus.SUCCESS
    assert run.event_actor == "hamad"
    assert run.head_branch == "origin/main"
    assert run.html_url == build["url"]
    # Jenkins reports milliseconds; RepoWorkflowRuns.duration is seconds.
    assert run.duration == 125
    assert run.conducted_at.isoformat() == "2025-08-10T12:00:00+00:00"


def test_a_build_without_the_git_plugin_records_with_nulls_rather_than_raising():
    build = get_jenkins_build_dict_without_git_plugin()

    run = _handler()._adapt_jenkins_build_to_workflow_run(uuid4_str(), build)

    assert run.head_branch is None
    assert run.event_actor is None
    assert run.status == RepoWorkflowRunsStatus.SUCCESS


def test_a_malformed_build_is_skipped_without_losing_the_batch():
    class Repo:
        def get_repo_workflow_run_by_provider_workflow_run_id(self, *args):
            return None

    class Api:
        @staticmethod
        def get_builds(*args):
            # Second build has no "number", so adaptation raises for it alone.
            return [get_jenkins_build_dict(number=2), {"timestamp": 1754827200000}]

    class Workflow:
        id = uuid4_str()
        provider_workflow_id = "deploy-api"

    class OrgRepoStub:
        repo_id = uuid4_str()

    handler = JenkinsETLHandler(uuid4_str(), Api(), Repo())
    runs, _ = handler.get_workflow_runs(
        OrgRepoStub(), Workflow(), _epoch_start()
    )

    assert [r.provider_workflow_run_id for r in runs] == ["2"]


def test_bookmark_rewinds_to_the_oldest_running_build():
    handler = _handler()
    builds = [
        get_jenkins_build_dict(number=3, timestamp=3000, result=None, building=True),
        get_jenkins_build_dict(number=2, timestamp=2000, result="SUCCESS"),
    ]

    bookmark = handler._get_new_bookmark_time_stamp(builds)

    # The running build must be re-fetched next cycle, so the bookmark cannot
    # advance past it.
    assert bookmark == handler._get_datetime_from_epoch_ms(3000)
```

Add this helper near the top of the file, below the imports:

```python
import pytz
from datetime import datetime


def _epoch_start() -> datetime:
    return datetime.fromtimestamp(0, tz=pytz.UTC)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend/analytics_server && python -m pytest tests/service/workflows/sync/test_etl_jenkins_handler.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'mhq.service.workflows.sync.etl_jenkins_handler'`

- [ ] **Step 3: Write the handler**

Create `backend/analytics_server/mhq/service/workflows/sync/etl_jenkins_handler.py`:

```python
# CLUSTOX: Jenkins deployment detection. Implements the same two-method
# contract as GitHub Actions, so nothing downstream of the sync changes.
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from uuid import uuid4

import pytz

from mhq.service.workflows.sync.etl_provider_handler import WorkflowProviderETLHandler
from mhq.store.models.code import (
    OrgRepo,
    RepoWorkflow,
    RepoWorkflowProviders,
    RepoWorkflowRuns,
    RepoWorkflowRunsStatus,
)
from mhq.utils.log import LOG
from mhq.utils.time import time_now


class JenkinsETLHandler(WorkflowProviderETLHandler):
    def __init__(self, org_id: str, jenkins_api_service, workflow_repo_service):
        self.org_id = org_id
        self._api = jenkins_api_service
        self._workflow_repo_service = workflow_repo_service
        self._provider = RepoWorkflowProviders.JENKINS.value

    def check_pat_validity(self) -> bool:
        if not self._api.check_pat():
            raise Exception("Jenkins credentials are invalid or Jenkins is unreachable")
        return True

    def get_workflow_runs(
        self,
        org_repo: OrgRepo,
        repo_workflow: RepoWorkflow,
        bookmark: datetime,
    ) -> Tuple[List[RepoWorkflowRuns], datetime]:
        try:
            builds = self._api.get_builds(
                repo_workflow.provider_workflow_id, bookmark
            )
        except Exception as e:
            # Bookmark is returned unchanged by raising: the caller does not
            # advance it, so this window is re-fetched next cycle.
            raise Exception(
                f"[Jenkins Sync Repo Workflow Worker] Error fetching job "
                f"{repo_workflow.provider_workflow_id} for repo "
                f"{str(org_repo.repo_id)}: {str(e)}"
            )

        if not builds:
            LOG.info(
                f"[Jenkins Sync Repo Workflow Worker] No builds found for job "
                f"{repo_workflow.provider_workflow_id}. Org: {self.org_id}"
            )
            return [], bookmark

        runs = []
        for build in builds:
            try:
                runs.append(
                    self._adapt_jenkins_build_to_workflow_run(
                        str(repo_workflow.id), build
                    )
                )
            except Exception as e:
                # One malformed build must not lose the rest of the batch.
                LOG.warn(
                    f"[Jenkins Sync Repo Workflow Worker] Skipping build "
                    f"{build.get('number')}: {str(e)}"
                )

        return runs, self._get_new_bookmark_time_stamp(builds)

    def _get_new_bookmark_time_stamp(self, builds: List[Dict]) -> datetime:
        """
        Rewind to the oldest still-running build so it is re-fetched once it
        finishes. Mirrors the GitHub Actions handler.
        """
        pending = [
            self._get_datetime_from_epoch_ms(build["timestamp"])
            for build in builds
            if build.get("building") or build.get("result") is None
        ]
        return min(pending) if pending else time_now()

    def _adapt_jenkins_build_to_workflow_run(
        self, repo_workflow_id: str, build: Dict
    ) -> RepoWorkflowRuns:
        existing = self._workflow_repo_service.get_repo_workflow_run_by_provider_workflow_run_id(
            repo_workflow_id, str(build["number"])
        )
        run_id = existing.id if existing else uuid4()

        duration = build.get("duration")
        return RepoWorkflowRuns(
            id=run_id,
            repo_workflow_id=repo_workflow_id,
            provider_workflow_run_id=str(build["number"]),
            event_actor=self._get_actor(build),
            head_branch=self._get_branch(build),
            status=self._get_repo_workflow_status(build),
            created_at=time_now(),
            updated_at=time_now(),
            conducted_at=self._get_datetime_from_epoch_ms(build["timestamp"]),
            duration=int(duration / 1000) if duration else None,
            meta=build,
            html_url=build.get("url"),
        )

    @staticmethod
    def _get_repo_workflow_status(build: Dict) -> RepoWorkflowRunsStatus:
        result = build.get("result")
        if build.get("building") or result is None:
            return RepoWorkflowRunsStatus.PENDING
        if result == "SUCCESS":
            return RepoWorkflowRunsStatus.SUCCESS
        if result == "ABORTED":
            return RepoWorkflowRunsStatus.CANCELLED
        # FAILURE and UNSTABLE. UNSTABLE means the build finished but something
        # -- usually tests -- failed; counting it as a deployment would report a
        # red build as a successful ship.
        return RepoWorkflowRunsStatus.FAILURE

    @staticmethod
    def _get_datetime_from_epoch_ms(ms: int) -> datetime:
        return datetime.fromtimestamp(ms / 1000, tz=pytz.UTC)

    @staticmethod
    def _get_branch(build: Dict) -> Optional[str]:
        # Contributed by the git plugin. A freestyle job with no SCM has none.
        for action in build.get("actions", []):
            revision = (action or {}).get("lastBuiltRevision")
            if revision and revision.get("branch"):
                return revision["branch"][0].get("name")
        return None

    @staticmethod
    def _get_actor(build: Dict) -> Optional[str]:
        for action in build.get("actions", []):
            causes = (action or {}).get("causes")
            if causes:
                return causes[0].get("userId") or causes[0].get("userName")
        return None
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend/analytics_server && python -m pytest tests/service/workflows/sync/test_etl_jenkins_handler.py -v`
Expected: PASS (9 tests)

- [ ] **Step 5: Format and lint**

Run: `cd backend/analytics_server && black mhq/service/workflows/sync/etl_jenkins_handler.py mhq/exapi/jenkins.py && flake8 mhq/service/workflows/sync/etl_jenkins_handler.py mhq/exapi/jenkins.py`
Expected: reformatted if needed, no flake8 output

- [ ] **Step 6: Commit**

```bash
git add backend/analytics_server/mhq/service/workflows/sync/etl_jenkins_handler.py \
        backend/analytics_server/tests/service/workflows/sync/test_etl_jenkins_handler.py
git commit -m "feat(jenkins): map builds to workflow runs"
```

---

### Task 5: Wire the handler into the sync

**Files:**
- Create: `backend/analytics_server/mhq/utils/jenkins.py`
- Modify: `backend/analytics_server/mhq/service/workflows/sync/etl_workflows_factory.py`
- Modify: `backend/analytics_server/mhq/service/workflows/sync/etl_jenkins_handler.py` (append factory function)
- Test: `backend/analytics_server/tests/service/workflows/sync/test_etl_workflows_factory.py` (extend)

**Interfaces:**
- Consumes: `JenkinsETLHandler` (Task 4), `JenkinsApiService` (Task 2).
- Produces:
  - `get_jenkins_config(org_id: str) -> Tuple[Optional[str], Optional[str]]` returning `(base_url, username)`
  - `get_jenkins_etl_handler(org_id: str) -> JenkinsETLHandler`

- [ ] **Step 1: Write the failing test**

Append to `backend/analytics_server/tests/service/workflows/sync/test_etl_workflows_factory.py`:

```python
def test_factory_returns_a_jenkins_handler():
    from mhq.service.workflows.sync.etl_jenkins_handler import JenkinsETLHandler

    factory = WorkflowETLFactory("org-id")
    handler = factory(RepoWorkflowProviders.JENKINS.name)

    assert isinstance(handler, JenkinsETLHandler)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/analytics_server && python -m pytest tests/service/workflows/sync/test_etl_workflows_factory.py::test_factory_returns_a_jenkins_handler -v`
Expected: FAIL with `NotImplementedError: Unknown provider - JENKINS`

- [ ] **Step 3: Add the config reader**

Create `backend/analytics_server/mhq/utils/jenkins.py`:

```python
# CLUSTOX: Jenkins needs a base URL and username alongside its API token.
# The token is a secret and lives encrypted in access_token_enc_chunks; these
# two are not, and follow the existing provider_meta precedent used for
# GitHub's custom domain.
from typing import Optional, Tuple

from mhq.store.models import Integration, UserIdentityProvider
from mhq.store.repos.core import CoreRepoService


def get_jenkins_config(org_id: str) -> Tuple[Optional[str], Optional[str]]:
    core_repo_service = CoreRepoService()
    integrations = core_repo_service.get_org_integrations_for_names(
        org_id, [UserIdentityProvider.JENKINS.value]
    )
    if not integrations or not integrations[0].provider_meta:
        return None, None

    meta = integrations[0].provider_meta
    return meta.get("base_url"), meta.get("username")
```

- [ ] **Step 4: Add the handler factory function**

Append to `backend/analytics_server/mhq/service/workflows/sync/etl_jenkins_handler.py`:

```python
def get_jenkins_etl_handler(org_id: str) -> JenkinsETLHandler:
    from mhq.exapi.jenkins import JenkinsApiService
    from mhq.store.models import UserIdentityProvider
    from mhq.store.repos.core import CoreRepoService
    from mhq.store.repos.workflows import WorkflowRepoService
    from mhq.utils.jenkins import get_jenkins_config

    api_token = CoreRepoService().get_access_token(
        org_id, UserIdentityProvider.JENKINS
    )
    base_url, username = get_jenkins_config(org_id)

    if not (api_token and base_url and username):
        LOG.error(
            f"Jenkins is not fully configured for org {org_id}: "
            f"base_url={'set' if base_url else 'missing'}, "
            f"username={'set' if username else 'missing'}, "
            f"token={'set' if api_token else 'missing'}"
        )

    return JenkinsETLHandler(
        org_id,
        JenkinsApiService(base_url or "", username or "", api_token or ""),
        WorkflowRepoService(),
    )
```

- [ ] **Step 5: Register in the factory**

Replace `backend/analytics_server/mhq/service/workflows/sync/etl_workflows_factory.py` with:

```python
from mhq.service.workflows.sync.etl_github_actions_handler import (
    get_github_actions_etl_handler,
)

# CLUSTOX: Jenkins as a third deployment source.
from mhq.service.workflows.sync.etl_jenkins_handler import get_jenkins_etl_handler
from mhq.service.workflows.sync.etl_provider_handler import WorkflowProviderETLHandler
from mhq.store.models.code import RepoWorkflowProviders


class WorkflowETLFactory:
    def __init__(self, org_id: str):
        self.org_id = org_id

    def __call__(self, provider: str) -> WorkflowProviderETLHandler:
        if provider == RepoWorkflowProviders.GITHUB_ACTIONS.name:
            return get_github_actions_etl_handler(self.org_id)
        if provider == RepoWorkflowProviders.JENKINS.name:
            return get_jenkins_etl_handler(self.org_id)
        raise NotImplementedError(f"Unknown provider - {provider}")
```

- [ ] **Step 6: Run the full backend suite**

Run: `cd backend/analytics_server && python -m pytest tests -q`
Expected: all pass, including the pre-existing 159

- [ ] **Step 7: Commit**

```bash
git add backend/analytics_server/mhq/utils/jenkins.py \
        backend/analytics_server/mhq/service/workflows/sync/etl_workflows_factory.py \
        backend/analytics_server/mhq/service/workflows/sync/etl_jenkins_handler.py \
        backend/analytics_server/tests/service/workflows/sync/test_etl_workflows_factory.py
git commit -m "feat(jenkins): resolve credentials and register the handler"
```

---

### Task 6: Flask routes for jobs and mappings

**Files:**
- Modify: `backend/analytics_server/mhq/api/integrations.py`
- Test: `backend/analytics_server/tests/api/test_jenkins_routes.py` (create)

**Interfaces:**
- Consumes: `JenkinsApiService` (Task 2), `get_jenkins_config` (Task 5), `RepoWorkflowProviders.JENKINS` (Task 1).
- Produces:
  - `GET /internal/<org_id>/integrations/jenkins/jobs` → `[{name, full_name, url}]`
  - `POST /internal/<org_id>/integrations/jenkins/mappings` body `{org_repo_id, job_full_name}` → `{ok: true, deactivated_github_workflows: int}`
  - `DELETE /internal/<org_id>/integrations/jenkins/mappings` body `{repo_workflow_id}` → `{ok: true}`

- [ ] **Step 1: Write the failing test for one-source enforcement**

Create `backend/analytics_server/tests/api/test_jenkins_routes.py`:

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/analytics_server && python -m pytest tests/api/test_jenkins_routes.py -v`
Expected: FAIL with `ImportError: cannot import name 'deactivate_github_actions_workflows_for_repo'`

- [ ] **Step 3: Write the enforcement helper**

Add to `backend/analytics_server/mhq/api/integrations.py`:

```python
# CLUSTOX: one deployment source per repo. A repo tracked through both GitHub
# Actions and Jenkins would count every deploy twice, doubling Deployment
# Frequency with nothing visibly wrong. Deactivation is reversible: the rows
# survive, so removing the Jenkins mapping can restore them.
from typing import List

from mhq.store.models.code import RepoWorkflowProviders


def deactivate_github_actions_workflows_for_repo(workflows: List) -> int:
    deactivated = 0
    for workflow in workflows:
        if (
            workflow.provider == RepoWorkflowProviders.GITHUB_ACTIONS
            and workflow.is_active
        ):
            workflow.is_active = False
            deactivated += 1
    return deactivated
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend/analytics_server && python -m pytest tests/api/test_jenkins_routes.py -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Add the three routes**

Add to `backend/analytics_server/mhq/api/integrations.py`, following the blueprint and `@queryschema` patterns already in that file. The mapping route must insert the Jenkins `RepoWorkflow` row and call `deactivate_github_actions_workflows_for_repo` **inside the same transaction**, so a failure cannot leave a repo with two active deployment sources:

```python
@app.route("/internal/<org_id>/integrations/jenkins/jobs", methods={"GET"})
def get_jenkins_jobs(org_id: str):
    from mhq.exapi.jenkins import JenkinsApiService
    from mhq.store.models import UserIdentityProvider
    from mhq.store.repos.core import CoreRepoService
    from mhq.utils.jenkins import get_jenkins_config

    api_token = CoreRepoService().get_access_token(
        org_id, UserIdentityProvider.JENKINS
    )
    base_url, username = get_jenkins_config(org_id)
    if not (api_token and base_url and username):
        return {"error": "Jenkins is not configured for this workspace"}, 400

    return JenkinsApiService(base_url, username, api_token).get_jobs()
```

Write the two `mappings` routes in the same file, using `WorkflowRepoService` to create and soft-delete `RepoWorkflow` rows with `provider=RepoWorkflowProviders.JENKINS` and `type=RepoWorkflowType.DEPLOYMENT`.

- [ ] **Step 6: Run the full backend suite**

Run: `cd backend/analytics_server && python -m pytest tests -q && black --check mhq && flake8 mhq`
Expected: all pass, formatting clean

- [ ] **Step 7: Commit**

```bash
git add backend/analytics_server/mhq/api/integrations.py \
        backend/analytics_server/tests/api/test_jenkins_routes.py
git commit -m "feat(jenkins): expose job listing and mapping routes"
```

---

### Task 7: Job listing and mapping BFF endpoints

**Files:**
- Create: `web-server/pages/api/clustox/jenkins/jobs.ts`
- Create: `web-server/pages/api/clustox/jenkins/mappings.ts`

**Interfaces:**
- Consumes: the Flask routes from Task 6; `Endpoint` from `@/api-helpers/global`; the `internal` axios instance exported from `web-server/src/api-helpers/axios.ts:26`. Workspace scoping is applied centrally by `Endpoint.serve()` on the validated `org_id`, so these handlers need no explicit guard call.
- Produces:
  - `GET /api/clustox/jenkins/jobs?org_id=<uuid>` → `{ jobs: Array<{name, full_name, url}> }`
  - `POST /api/clustox/jenkins/mappings` body `{ org_id, org_repo_id, job_full_name }` → `{ ok: true, deactivated_github_workflows: number }`
  - `DELETE /api/clustox/jenkins/mappings` body `{ org_id, repo_workflow_id }` → `{ ok: true }`

- [ ] **Step 1: Write the endpoint that lists jobs**

Create `web-server/pages/api/clustox/jenkins/jobs.ts`:

```ts
import * as yup from 'yup';

import { Endpoint } from '@/api-helpers/global';
import { internal } from '@/api-helpers/axios';

// CLUSTOX: proxies the workspace's Jenkins job list. org_id is validated by
// Endpoint.serve(), which asserts the caller may act on that workspace.
const getSchema = yup.object().shape({
  org_id: yup.string().uuid().required()
});

const endpoint = new Endpoint(getSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  const jobs = await internal.get(
    `/internal/${req.payload.org_id}/integrations/jenkins/jobs`
  );
  res.send({ jobs: jobs.data });
});

export default endpoint.serve();
```

- [ ] **Step 2: Write the mapping endpoint**

Create `web-server/pages/api/clustox/jenkins/mappings.ts`:

```ts
import * as yup from 'yup';

import { Endpoint } from '@/api-helpers/global';
import { internal } from '@/api-helpers/axios';

const postSchema = yup.object().shape({
  org_id: yup.string().uuid().required(),
  org_repo_id: yup.string().uuid().required(),
  job_full_name: yup.string().required()
});

const deleteSchema = yup.object().shape({
  org_id: yup.string().uuid().required(),
  repo_workflow_id: yup.string().uuid().required()
});

const endpoint = new Endpoint(postSchema);

endpoint.handle.POST(postSchema, async (req, res) => {
  // One deployment source per repo: creating this mapping deactivates the
  // repo's GitHub Actions workflows so deployments are not counted twice.
  const result = await internal.post(
    `/internal/${req.payload.org_id}/integrations/jenkins/mappings`,
    {
      org_repo_id: req.payload.org_repo_id,
      job_full_name: req.payload.job_full_name
    }
  );
  res.send(result.data);
});

endpoint.handle.DELETE(deleteSchema, async (req, res) => {
  const result = await internal.delete(
    `/internal/${req.payload.org_id}/integrations/jenkins/mappings`,
    { data: { repo_workflow_id: req.payload.repo_workflow_id } }
  );
  res.send(result.data);
});

export default endpoint.serve();
```

- [ ] **Step 3: Verify types compile**

Run: `cd web-server && yarn tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add web-server/pages/api/clustox/jenkins/
git commit -m "feat(jenkins): add job listing and mapping endpoints"
```

---

### Task 8: Cross-workspace isolation tests

**Files:**
- Create: `web-server/e2e/jenkins.spec.ts`

**Interfaces:**
- Consumes: the BFF endpoints from Task 7.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the isolation tests**

Create `web-server/e2e/jenkins.spec.ts`:

```ts
/**
 * Jenkins endpoints must obey the same workspace boundary as everything else.
 *
 * Running:
 *   docker compose up -d
 *   cd web-server && yarn playwright test e2e/jenkins.spec.ts
 */
import { APIRequestContext, expect, request, test } from '@playwright/test';

const APP = 'http://localhost:3333';

const SUPERADMIN = {
  email: process.env.SUPERADMIN_EMAIL || 'admin@clustox.com',
  password: process.env.SUPERADMIN_PASSWORD || ''
};

const signIn = async (email: string, password: string) => {
  const ctx = await request.newContext({ baseURL: APP });
  const csrf = await (await ctx.get('/api/auth/csrf')).json();
  const res = await ctx.post('/api/auth/callback/credentials', {
    form: { csrfToken: csrf.csrfToken, email, password, json: 'true' },
    failOnStatusCode: false
  });
  expect(res.status(), `sign-in failed for ${email}`).toBe(200);
  return ctx;
};

const unique = (p: string) =>
  `${p}.${Date.now()}${Math.floor(Math.random() * 1000)}@clustox.com`;

const createAdmin = async (su: APIRequestContext, name: string) => {
  const email = unique(name.toLowerCase().replace(/\s+/g, '.'));
  const password = 'E2eJenkinsPass123';
  const res = await su.post('/api/clustox/users', {
    data: { name, email, password, role: 'ADMIN', team_ids: [] }
  });
  expect(res.status()).toBe(200);
  const { user_id, org_id } = await res.json();
  return { userId: user_id, orgId: org_id as string, email, password };
};

test.describe('jenkins workspace isolation', () => {
  test.skip(!SUPERADMIN.password, 'SUPERADMIN_PASSWORD not set');

  let su: APIRequestContext;
  let alpha: Awaited<ReturnType<typeof createAdmin>>;
  let beta: Awaited<ReturnType<typeof createAdmin>>;
  let alphaCtx: APIRequestContext;

  test.beforeAll(async () => {
    su = await signIn(SUPERADMIN.email, SUPERADMIN.password);
    alpha = await createAdmin(su, 'Jenkins Alpha');
    beta = await createAdmin(su, 'Jenkins Beta');
    alphaCtx = await signIn(alpha.email, alpha.password);
  });

  test.afterAll(async () => {
    for (const id of [alpha.userId, beta.userId]) {
      await su.fetch(`/api/clustox/users/${id}`, {
        method: 'DELETE',
        failOnStatusCode: false
      });
    }
  });

  test('an admin cannot list another workspace jenkins jobs', async () => {
    const res = await alphaCtx.get(
      `/api/clustox/jenkins/jobs?org_id=${beta.orgId}`,
      { failOnStatusCode: false }
    );
    expect(res.status()).toBe(403);
  });

  test('an admin cannot map a job into another workspace', async () => {
    const res = await alphaCtx.post('/api/clustox/jenkins/mappings', {
      data: {
        org_id: beta.orgId,
        org_repo_id: '00000000-0000-4000-8000-000000000001',
        job_full_name: 'deploy-api'
      },
      failOnStatusCode: false
    });
    expect(res.status()).toBe(403);
  });

  test('unauthenticated requests are rejected', async ({ request: req }) => {
    const res = await req.get(
      `${APP}/api/clustox/jenkins/jobs?org_id=${alpha.orgId}`,
      { failOnStatusCode: false, maxRedirects: 0 }
    );
    expect(res.status()).toBe(401);
  });

  test('a malformed org_id is a 400, not a 403', async () => {
    // Schema validation runs before the access check, so bad input is not
    // reported as a permission problem.
    const res = await alphaCtx.get('/api/clustox/jenkins/jobs?org_id=nonsense', {
      failOnStatusCode: false
    });
    expect(res.status()).toBe(400);
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `cd web-server && SUPERADMIN_PASSWORD=<the value from .env> yarn playwright test e2e/jenkins.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 3: Commit**

```bash
git add web-server/e2e/jenkins.spec.ts
git commit -m "test(jenkins): cross-workspace isolation for jenkins endpoints"
```

---

### Task 9: Integrations UI

> **Resolution warning.** Tasks 1–8 give exact code. This one specifies
> behaviour and contracts but not full component bodies, because the MUI markup
> is long, mechanical, and better written against the live components than
> transcribed from a plan. Treat the acceptance criteria in each step as the
> requirement and follow the existing patterns in `pages/integrations.tsx`. If
> you want this at the same resolution as the backend tasks, ask before
> starting rather than improvising.

**Files:**
- Modify: `web-server/src/constants/integrations.ts`
- Modify: `web-server/pages/integrations.tsx`
- Create: `web-server/src/components/ClustoxJenkinsSetup.tsx`
- Create: `web-server/src/components/ClustoxJenkinsMapping.tsx`

**Interfaces:**
- Consumes: BFF endpoints from Task 7.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add Jenkins to the integration enum**

In `web-server/src/constants/integrations.ts`, add to the `Integration` enum:

```ts
// CLUSTOX: Jenkins is a deployment provider, not a code provider -- it is
// deliberately absent from CODE_PROVIDER_INTEGRATIONS_MAP.
JENKINS = 'jenkins'
```

- [ ] **Step 2: Build the credentials form**

Create `web-server/src/components/ClustoxJenkinsSetup.tsx` with a form collecting **base URL**, **username**, and **API token**, posting to `/api/resources/orgs/{orgId}/integration` with `provider: 'jenkins'`, `the_good_stuff: <api token>`, and `meta_data: { base_url, username }`. Validate the connection server-side before saving and surface a failure inline rather than as a toast, so a wrong URL is visible next to the field that caused it.

- [ ] **Step 3: Build the mapping table**

Create `web-server/src/components/ClustoxJenkinsMapping.tsx`: a table of the workspace's repos, each with a dropdown of Jenkins jobs from `GET /api/clustox/jenkins/jobs`. Selecting a job POSTs to `/api/clustox/jenkins/mappings`.

Before submitting, if the repo has active GitHub Actions workflows, show a confirmation dialog:

> Mapping a Jenkins job will stop counting this repo's GitHub Actions runs as deployments, so they are not counted twice. You can undo this by removing the mapping.

- [ ] **Step 4: Render the Jenkins card**

In `web-server/pages/integrations.tsx`, add a Jenkins card alongside GitHub and GitLab that opens `ClustoxJenkinsSetup` when unlinked and `ClustoxJenkinsMapping` when linked.

- [ ] **Step 5: Verify**

Run: `cd web-server && yarn tsc --noEmit && yarn lint`
Expected: no errors

Then manually: link Jenkins, confirm jobs list, map one to a repo, confirm the GitHub Actions warning appears, and confirm the mapping persists across a refresh.

- [ ] **Step 6: Commit**

```bash
git add web-server/src/constants/integrations.ts \
        web-server/pages/integrations.tsx \
        web-server/src/components/ClustoxJenkinsSetup.tsx \
        web-server/src/components/ClustoxJenkinsMapping.tsx
git commit -m "feat(jenkins): connect jenkins and map jobs to repositories"
```

---

## Final verification

- [ ] `cd backend/analytics_server && python -m pytest tests -q` — all pass
- [ ] `cd backend/analytics_server && black --check mhq && flake8 mhq` — clean
- [ ] `cd web-server && yarn tsc --noEmit && yarn test` — clean
- [ ] `cd web-server && yarn playwright test e2e/` — all suites pass
- [ ] Manual: against a real Jenkins, link it, map a job, trigger a sync, confirm the build appears as a deployment and Deployment Frequency increases

**The last item is the one that matters most and cannot be automated.** Fixtures encode assumptions about a Jenkins API that varies by version and plugin set. Until this passes against the target server, the integration is unverified regardless of how green the suite is.
