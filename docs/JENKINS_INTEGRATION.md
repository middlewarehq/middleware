# Jenkins integration — design

**Status:** approved, not implemented
**Date:** 2026-08-10
**Estimate:** 5–6 days

Jenkins builds become deployments, so Deployment Frequency and Lead Time
reflect how teams actually ship rather than only what GitHub Actions does.

---

## Decisions

Four decisions shape everything below. They were settled before design, and
changing any of them changes the design rather than the implementation.

| Decision | Choice | Consequence |
|---|---|---|
| Network direction | **Pull** — Middleware calls Jenkins | Jenkins is reachable from the Middleware host, so this fits the existing ETL contract with no new ingest endpoint. |
| Job → repo mapping | **Manual, in the UI** | Explicit and accurate. Mapping a job is also what designates it a deployment, so PR builds, lint jobs, and nightlies are ignored by default — and staging jobs are excluded simply by not mapping them. |
| Repo with two CI systems | **One deployment source per repo** | Mapping Jenkins deactivates that repo's active deployment workflows, after a UI warning. Prevents silent double-counting of Deployment Frequency. Unmapping restores exactly the rows that mapping switched off — recorded on the Jenkins row's `meta` — and nothing else: a repo can hold deployment workflows the admin deselected in the team config, which Jenkins never touched. |
| Delivery shape | **Single slice** | One PR rather than a thin proof first. Simpler to plan; the Jenkins API risk (below) surfaces later than it otherwise would. |

## The risk worth naming up front

Jenkins' REST API varies by version, by job type (freestyle, pipeline,
multibranch), and by installed plugins. This design is written against the
documented API. Whether it matches *your* Jenkins is not knowable until it
talks to one.

Everything else here is predictable. This is not. Under the single-slice
approach it is verified near the end, so budget for follow-up work.

---

## Architecture

Nothing downstream of the sync changes. `sync_org_workflows` already iterates
active `RepoWorkflow` rows and asks a factory for a handler per provider.
Jenkins is a third branch in that factory. Deployment frequency, merge-to-deploy
and lead time read `RepoWorkflowRuns` and never ask where a run came from.

### Components

**`JenkinsETLHandler`** (new) implements `WorkflowProviderETLHandler`, whose
whole contract is two methods:

- `check_pat_validity()` — `GET {base_url}/api/json`, expect 200.
- `get_workflow_runs(org_repo, repo_workflow, bookmark)` — `GET
  {base_url}/job/{job_path}/api/json` with a `tree=` selector; keep builds
  newer than the bookmark; return them and the new high-water mark.

**`WorkflowETLFactory`** (changed) — one branch returning the Jenkins handler.

**`RepoWorkflowProviders`** (changed) — add `JENKINS = "jenkins"`. No migration
required: despite the SQLAlchemy `ENUM()` wrapper, `RepoWorkflow.provider` is
persisted as `character varying` and the schema declares no Postgres enum
types, so a new provider is a code change only.

**Job mapping API and UI** (new) — list the workspace's Jenkins jobs; create a
mapping. A mapping writes a `RepoWorkflow` row with `provider=JENKINS`,
`org_repo_id` set to the chosen repo, and `provider_workflow_id` set to the
job's full path form, so folders and multibranch jobs address correctly.

**One-source enforcement** (new) — creating a Jenkins mapping sets
`is_active=False` on that repo's `GITHUB_ACTIONS` workflows. Reversible: the
rows survive.

### Credentials

No schema change. `Integration` is keyed `(org_id, name)`, giving one Jenkins
connection per workspace, exactly like GitHub. Jenkins needs three values and
they split across existing columns:

| Value | Column |
|---|---|
| API token | `access_token_enc_chunks` (encrypted, as GitHub's PAT) |
| Base URL, username | `provider_meta` (JSONB) |

Jenkins uses HTTP basic auth as `username:api_token`. The username is a
non-secret companion to the token, so it belongs in metadata.

### Deliberately excluded

No new tables. No change to metric computation. No abstraction layer over
providers — the contract is two methods, and there is nothing worth
generalising until a third real provider shows what actually varies.

---

## Data flow

```
cron (30 min) → POST /sync → per workspace → sync_org_workflows(org_id)
  → for each active RepoWorkflow
      → WorkflowETLFactory(provider) → JenkinsETLHandler
      → bookmark = BookmarkService.get_bookmark(...)
      → GET {base}/job/{path}/api/json?tree=builds[...]
      → keep builds newer than bookmark → [RepoWorkflowRuns]
      → persist, then advance bookmark to newest conducted_at
  → process_merge_to_deploy_cache → lead time, deployment frequency
```

The bookmark advances **only after a successful persist**, so a mid-sync
failure re-fetches its window rather than silently skipping it.

Backfill needs no special handling: `BookmarkService` already defaults a first
run to `DEFAULT_SYNC_DAYS` (31, overridable per workspace) rather than to the
present moment. This is the setting behind the earlier "no history after
connecting a repo" behaviour; Jenkins inherits the fix.

### Build → `RepoWorkflowRuns`

| Jenkins field | Column | Note |
|---|---|---|
| `number` | `provider_workflow_run_id` | as string |
| `result` | `status` | mapped below |
| `timestamp` | `conducted_at` | epoch ms → UTC datetime |
| `duration` | `duration` | ms → seconds, matching the Actions handler |
| `url` | `html_url` | |
| `actions[].lastBuiltRevision.branch` | `head_branch` | git plugin |
| `actions[].causes[].userId` | `event_actor` | `timer` / `scm` when auto-triggered |
| commit SHA | `meta` | unused for now; enables commit-level de-duplication later without a migration |

### Status mapping

```
SUCCESS  → SUCCESS
FAILURE  → FAILURE
ABORTED  → CANCELLED
null     → PENDING     (still running)
UNSTABLE → FAILURE
```

`UNSTABLE` means the build finished but something — usually tests — failed.
Mapping it to `FAILURE` keeps it out of Deployment Frequency. A team that ships
unstable builds anyway would be undercounted; that is the safer direction than
counting a red build as a successful deploy. Flip it if your Jenkins uses
`UNSTABLE` differently.

### Git plugin dependency

`head_branch`, `event_actor` and the commit SHA all come from the git plugin's
contribution to `actions[]`. A job without the git plugin, or a freestyle job
with no SCM, returns none of it. Those builds still record as deployments with
correct timing, but with a null branch, so branch filtering will not apply to
them.

This is graceful degradation, not failure — but it will show up as nulls in the
data and should not be mistaken for a bug.

---

## Error handling

Every case degrades to "this workspace's sync records FAILED with a reason,
other workspaces continue" — the isolation the multi-workspace sync already
provides. Jenkins-specific handling:

| Failure | Handling |
|---|---|
| Token revoked or wrong | `check_pat_validity` fails before any job is fetched. Recorded with reason, visible on the Workspaces page. |
| Jenkins unreachable | Bounded connect and read timeouts. Recorded; not retried within the run. |
| Job deleted or renamed | 404 for that job. Record the detail, **keep the mapping**, continue to the next workflow. |
| Build JSON missing fields | Skip that build, log it, keep the rest of the batch. |
| Any of the above | Bookmark not advanced; the window is re-fetched next cycle. |

Keeping the mapping on a 404 is deliberate. A renamed job and a briefly
unreachable Jenkins are indistinguishable over the API, and silently unmapping
a repo on a transient error is worse than surfacing a failure an admin can act
on.

### Timeouts are load-bearing

The workspace sync loop is sequential. Without an explicit timeout, one hanging
Jenkins stalls every workspace queued behind it, turning a workspace-level
problem into an instance-level outage. The client therefore sets bounded
connect and read timeouts and a per-job ceiling.

Jenkins is the first integration likely to actually trigger the sequential-loop
limitation. If it becomes a real constraint, the fix is parallelising the
workspace loop — out of scope here.

### TLS verification

Internal Jenkins instances frequently use self-signed certificates.

**Decision: verify certificates, with no skip option in v1.** Add an escape
hatch only if a real Jenkins requires it. A skip-verification flag is easy to
add, hard to remove once relied upon, and silently accepts man-in-the-middle on
a connection carrying an API token.

---

## Testing

**pytest, against recorded Jenkins JSON fixtures:**

- Status mapping across all five `result` values, including `null` and `UNSTABLE`
- Epoch-ms → UTC, and ms → seconds conversions
- Bookmark advances to newest build on success; unchanged on failure
- Builds with no git plugin data record with a null branch rather than raising
- Malformed build is skipped without failing the batch
- Factory returns the Jenkins handler for `JENKINS`

**Request-level e2e, matching the existing isolation suites:**

- An admin cannot list or map another workspace's Jenkins jobs → 403
- Mapping endpoints reject unauthenticated requests → 401
- Mapping a Jenkins job deactivates that repo's GitHub Actions workflows

**Known gap:** none of this proves the integration works against a specific
Jenkins. Fixtures are recorded from a real instance and therefore encode
assumptions that may not hold for another version or plugin set. That
verification is manual, must happen against the target server, and is the most
likely source of follow-up work.

---

## Out of scope

- Jenkins as a source of **incidents** — `IncidentProvider` supports only
  github and gitlab; separate work.
- Build **logs** or artefacts.
- Triggering builds from Middleware. Read-only by design: the integration
  observes deployments, it does not perform them.
- Auto-discovering job → repo mappings from SCM configuration.
- Parallelising the workspace sync loop.
