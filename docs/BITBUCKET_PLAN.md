# Bitbucket Code Provider Implementation Plan (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bitbucket Cloud as a third code provider — repos, PRs, reviews and code stats feeding lead time, LOC, the contributor filter and revert-PR incidents.

**Architecture:** A v2 REST client (`exapi/bitbucket.py`) and an ETL handler implementing the existing four-method `CodeProviderETLHandler` contract, registered in `CodeETLFactory`. Frontend: an email+token modal validated through a small BFF endpoint (Bitbucket serves no CORS for Basic auth, unlike GitLab), and a workspace-based repo listing branch in `git_org_repos.ts`. Phase 2 (Pipelines) is a separate plan.

**Tech Stack:** Flask 3 + SQLAlchemy 2, requests, Next.js 15 pages router, MUI 5, yup.

**Spec:** `docs/BITBUCKET.md` — its **field-mapping table is the contract**; every adapter task below points at it.

## Global Constraints

- **No database migration, no new tables.** `CodeProvider.BITBUCKET` and `UserIdentityProvider.BITBUCKET` persist into `character varying` columns.
- Backend tests must pass. **Record the baseline count before your first change** (`cd backend/analytics_server && ./venv/bin/python -m pytest`) and report old → new. That venv is the only working one — the repo-root venv lacks Flask.
- Frontend must typecheck: `docker exec middleware-dev sh -lc 'cd /app/web-server && npx tsc --noEmit'`. Host `node_modules` is not installed; copy files in with `docker cp`.
- `black` + `flake8` clean on changed Python; `prettier` + `eslint` clean on changed TS.
- `# CLUSTOX:` / `// CLUSTOX:` comments explain WHY, never what.
- **The token never appears in a log, an error message, a test fixture, or a commit.** The email is not a secret; the token always is.
- **Never run `docker compose`.** Copying files into the running container is fine; rebuilding is not.
- Adapt per item: one malformed PR/activity entry skips that item with a warning, never the batch.
- Commit in logical chunks. Do not amend or force-push.

---

### Task 1: The Bitbucket API client

**Files:**
- Create: `backend/analytics_server/mhq/exapi/bitbucket.py`
- Create: `backend/analytics_server/mhq/exapi/models/bitbucket.py`
- Test: `backend/analytics_server/tests/exapi/test_bitbucket_api.py` (create `tests/exapi/__init__.py` if absent)

**Interfaces:**
- Consumes: nothing internal — pure HTTP client.
- Produces (Task 2 consumes these exact signatures):

```python
class BitbucketRateLimitExceeded(Exception): ...

class BitbucketApiService:
    def __init__(self, email: str, api_token: str): ...          # Basic auth pair
    def check_pat(self) -> bool: ...                              # GET /2.0/user
    def get_workspaces(self) -> List[Dict]: ...
    def get_workspace_repos(self, workspace: str) -> List[Dict]: ...
    def get_repo_pull_requests(self, workspace: str, repo_slug: str,
                               updated_since: datetime) -> List[Dict]: ...
    def get_pr_activity(self, workspace: str, repo_slug: str, pr_id: int) -> List[Dict]: ...
    def get_pr_diffstat(self, workspace: str, repo_slug: str, pr_id: int) -> List[Dict]: ...
```

Base URL `https://api.bitbucket.org/2.0`. Auth via `requests.Session` with `session.auth = (email, api_token)` — never a hand-built header, and never interpolated into a URL.

**Pagination is by `next` link, not page numbers.** Every list endpoint returns `{"values": [...], "next": "https://..."}`; follow `next` until absent, `pagelen=50`. PR listing filters server-side: `params={"q": f'updated_on > "{updated_since.isoformat()}"', "sort": "updated_on", "state": "MERGED,OPEN,DECLINED,SUPERSEDED"}` — without the explicit `state` list Bitbucket returns only OPEN PRs, which would silently hide every merged PR from lead time.

**429 raises `BitbucketRateLimitExceeded`** carrying the `Retry-After` header when present. The handler (Task 3) decides policy; the client only reports.

- [ ] **Step 1: Write the failing contract tests against realistic fixtures**

Fixtures are dicts in the test file shaped exactly like Bitbucket's documented payloads — not hand-simplified. The minimum PR fixture:

```python
BB_PR = {
    "id": 42,
    "title": "feat: add rate limiter",
    "state": "MERGED",
    "author": {"uuid": "{a1b2c3d4-0000-4000-8000-000000000001}", "nickname": "hamadr"},
    "source": {"branch": {"name": "feat/rate-limiter"}},
    "destination": {"branch": {"name": "main"}},
    "created_on": "2026-08-20T10:00:00+00:00",
    "updated_on": "2026-08-21T15:30:00+00:00",
    "merge_commit": {"hash": "abc123def456"},
    "participants": [
        {"role": "REVIEWER", "approved": True,
         "user": {"uuid": "{b2c3d4e5-0000-4000-8000-000000000002}", "nickname": "muzz"},
         "participated_on": "2026-08-21T12:00:00+00:00"}
    ],
    "links": {"html": {"href": "https://bitbucket.org/ws/repo/pull-requests/42"}},
}
```

Tests, each written to fail first:
- `test_pagination_follows_next_links` — two pages via mocked session, values concatenated, stops when `next` absent.
- `test_pr_listing_requests_all_states` — assert the `state` param includes MERGED; this is the silent-hide trap.
- `test_429_raises_rate_limit_with_retry_after` — mocked 429 with `Retry-After: 1800`.
- `test_auth_is_basic_session_auth` — `session.auth == (email, token)`; the token never appears in any URL the mock saw.

- [ ] **Step 2: Run, watch them fail** (`ModuleNotFoundError`), **implement, run again**

Model the error handling on `GitlabApiService._handle_error` (`mhq/exapi/gitlab.py:35`).

- [ ] **Step 3: black + flake8, commit**

```bash
git add backend/analytics_server/mhq/exapi backend/analytics_server/tests/exapi
git commit -m "feat(bitbucket): Bitbucket Cloud v2 API client"
```

---

### Task 2: The ETL handler — repos and PR adaptation

**Files:**
- Create: `backend/analytics_server/mhq/service/code/sync/etl_bitbucket_handler.py`
- Modify: `backend/analytics_server/mhq/store/models/code/enums.py` (add `BITBUCKET = "bitbucket"` to `CodeProvider`)
- Modify: `backend/analytics_server/mhq/store/models/integrations/enums.py:4` (`UserIdentityProvider`) — add `BITBUCKET = "bitbucket"`
- Test: `backend/analytics_server/tests/service/code/sync/test_etl_bitbucket_handler.py`

**Interfaces:**
- Consumes: Task 1's client, verbatim.
- Produces: `BitbucketETLHandler(CodeProviderETLHandler)` and `get_bitbucket_etl_handler(org_id) -> BitbucketETLHandler`. Task 4 registers it; Task 3 extends it.

Mirror `GitlabETLHandler` (`etl_gitlab_handler.py:42`) method-for-method, and its factory function (`:367`) for credentials: token via `CoreRepoService().get_access_token(org_id, UserIdentityProvider.BITBUCKET)`, **email via `provider_meta["email"]`** from `get_org_integrations_for_names` — the same pattern GitLab uses for `custom_domain`.

**The spec's field-mapping table is the requirement set.** The load-bearing rows:

- `state`: MERGED→MERGED, OPEN→OPEN, **DECLINED and SUPERSEDED→CLOSED**. Unknown state: skip that PR with a warning, never guess.
- `state_changed_at` for merged PRs = `updated_on` — Bitbucket has no `merged_at`; write the CLUSTOX comment on why.
- `merge_commit` is **null on unmerged PRs** — `_get_merge_commit_sha` must be `None`-safe, per PR.
- `author` = `author.uuid`, display name from `nickname`.
- `url` from `links.html.href`.

- [ ] **Step 1: Failing tests** — mirror `test_etl_gitlab_handler.py`'s shape (7 tests there; record what each covers before writing). Minimum: the four state mappings including an unknown state skipping only that PR; the null `merge_commit` case; `updated_on`-as-merge-time; author uuid landing in `PullRequest.author`.
- [ ] **Step 2: Implement, tests green**
- [ ] **Step 3: Full suite** — a failure in another provider's tests means a shared model was disturbed; fix before proceeding.
- [ ] **Step 4: Commit** (`feat(bitbucket): ETL handler for repos and pull requests`)

---

### Task 3: Activity, diffstat, and the 429 bookmark contract

**Files:**
- Modify: `etl_bitbucket_handler.py`
- Test: extend `test_etl_bitbucket_handler.py`

**Interfaces:** completes `get_repo_pull_requests_data(org_repo, bookmark) -> Tuple[List[PullRequest], List[PullRequestCommit], List[PullRequestEvent]]` — the exact contract signature at `etl_provider_handler.py:31-33`. All three lists matter: events carry the review timestamps that first_response_time reads.

Three behaviours, each with its own test written to fail first:

1. **Activity → review events.** From the mixed activity stream, an entry with `approval` or `comment` becomes a review event; earliest timestamp drives `first_response_time` (see how `_to_pr_events` / `_get_event_state` do it for GitLab, `etl_gitlab_handler.py:326,357`). Entries with unrecognised shape are skipped individually.
2. **Diffstat → `code_stats`,** summing `lines_added` / `lines_removed` over entries, `changed_files` = entry count. **A diffstat failure syncs the PR with `code_stats` absent** — assert the PR is present AND `additions` falls back to 0 via the model property; the LOC feed undercounts honestly, the PR never vanishes from lead time.
3. **429 = pause + resume.** When the client raises `BitbucketRateLimitExceeded` mid-repo, the handler returns everything fully processed so far; the bookmark (see how GitLab's caller advances it) ends at the last **stored** PR. Two tests, two failure directions:
   - `test_429_keeps_already_processed_prs_and_stops` — PRs before the 429 are returned, none after.
   - `test_429_does_not_advance_past_unfetched_prs` — the returned set's max `updated_on` is the resume point; a PR after the 429 is absent and NOT covered by it.

- [ ] Steps: failing tests → implement → full suite → commit (`feat(bitbucket): reviews, code stats, and rate-limit-safe sync`)

---

### Task 4: Revert detection and registration

**Files:**
- Create: `backend/analytics_server/mhq/service/code/sync/revert_prs_bitbucket_sync.py`
- Modify: `backend/analytics_server/mhq/service/code/sync/etl_code_factory.py` (third branch)
- Test: `backend/analytics_server/tests/service/code/sync/test_revert_pr_bitbucket_sync.py`

Mirror `revert_pr_gitlab_sync.py`. Detection: title starts with `revert:` or `revert "` (case-insensitive — Bitbucket's UI writes `Revert: <title>`); link to the original by branch name when the revert branch encodes it, title suffix match otherwise.

- [ ] **Tests must include the negative case**: a PR titled `Revert the decision to use tabs` (prose, not a revert) maps to nothing. Title heuristics without a negative test are how false CFR incidents ship.
- [ ] Factory branch + `test_every_provider_reaches_the_factory` asserting all three `CodeProvider` values dispatch without `NotImplementedError`.
- [ ] Full suite, black/flake8, commit (`feat(bitbucket): revert-PR incidents and factory registration`)

---

### Task 5: BFF — token check, linking, repo listing

**Files:**
- Create: `web-server/pages/api/internal/bitbucket/token-check.ts`
- Modify: `web-server/pages/api/internal/[org_id]/git_org_repos.ts` (Bitbucket branch beside the GitLab GraphQL branch at `:156`)
- Modify: `web-server/src/utils/auth.ts` (add `checkBitbucketValidity(email, token)` calling the BFF endpoint)
- Test: `web-server/src/utils/__tests__/bitbucketAuth.test.ts`

**Why a BFF endpoint where GitHub/GitLab validate in the browser:** Bitbucket's API sends no CORS headers for Basic auth from foreign origins — a browser call dies in preflight. The check endpoint takes `{email, token}`, calls `GET https://api.bitbucket.org/2.0/user` server-side with Basic auth, and returns only `{valid: boolean, nickname?: string}`.

- **The token is not logged, not echoed in the error body, and not persisted by this endpoint.** Linking still goes through the existing `linkProvider` → `/api/resources/orgs/<id>/integration` path with `meta_data: {email}` — email in `provider_meta`, token encrypted in `access_token_enc_chunks`, exactly like GitLab's `custom_domain` pattern.
- Repo listing: workspaces → repos per workspace, following `next` pagination, mapped to the same shape the GitLab branch returns (compare in-file). Fields: `id` = repo `uuid`, `name` = `slug`, `slug`, `web_url` from `links.html.href`, `branch` = `mainbranch.name`.

- [ ] Failing jest tests for the repo-shape adapter (fixture → the exact object `git_org_repos.ts` returns for GitLab — same keys)
- [ ] Implement; `tsc` clean; eslint/prettier clean
- [ ] Commit (`feat(bitbucket): server-side token check and workspace repo listing`)

---

### Task 6: The modal and wiring

**Files:**
- Create: `web-server/src/content/Dashboards/ConfigureBitbucketModalBody.tsx`
- Modify: `web-server/src/content/Dashboards/useIntegrationHandlers.tsx` (link + unlink entries beside GitLab's at `:29,:41`)
- Test: `web-server/src/content/Dashboards/__tests__/ConfigureBitbucketModalBody.test.tsx`

Mirror `ConfigureGitlabModalBody.tsx` structure. Differences, and only these:
- **Two fields**: Atlassian account email + API token. Email validated with a plain regex before any network call; the submit is disabled until both fields are non-empty.
- Validation via `checkBitbucketValidity` (Task 5) instead of a direct provider call.
- `linkProvider(token, orgId, Integration.BITBUCKET, { email })`.
- Error copy: invalid credentials → "Invalid email or API token" (the API cannot distinguish); missing-scope detection is not possible for Atlassian tokens, so the help link points at the token-creation page with the required scopes named in text: `account`, `repository`, `pullrequest`.

The `Integration.BITBUCKET` enum value already exists (`src/constants/integrations.ts:6`) — this task wires it, adds no enum.

- [ ] Render test mirroring `__tests__/ConfigureJiraModalBody.test.tsx`'s harness: renders both fields, submit disabled until filled, a failed check shows the error inline and does NOT call `linkProvider` (assert the mock), a passed check calls it with `{email}` meta.
- [ ] `tsc` clean, scoped jest green, commit (`feat(bitbucket): configuration modal`)

---

### Task 7: Provider-isolation regression and live verification

**Files:**
- Test: extend `backend/analytics_server/tests/service/code/sync/test_etl_bitbucket_handler.py`
- Test: `web-server/src/content/Dashboards/__tests__/integrations.test.tsx` (only if no equivalent exists — check first)

- [ ] **Isolation, backend:** with a Bitbucket integration row present and zero Bitbucket repos selected, the GitHub and GitLab sync paths produce identical output to a run without the row — assert on the factory dispatch and one representative GitHub handler test parameterised over "bitbucket row present/absent".
- [ ] **Isolation, frontend:** the integrations card shows Bitbucket as linkable without altering the GitHub/GitLab cards' state logic.
- [ ] **Live verification — the gate for opening the PR.** Not a subagent step; coordinate with the controller:
  1. Link a scratch Bitbucket workspace (2–3 PRs, at least one merged, one open, one with a review) through the real modal on `localhost:3333`.
  2. Trigger sync; watch `/app/backend/analytics_server` logs for the Bitbucket handler.
  3. Verify over real HTTP: the team's `/lead_time`, `/loc`, and `/contributors` responses include the Bitbucket repo's PRs with non-zero `code_stats`.
  4. Verify the dashboard renders them and the contributor dropdown lists the Bitbucket author.
- [ ] Full backend suite + full frontend scoped suites, report all numbers, commit (`test(bitbucket): provider isolation`)
