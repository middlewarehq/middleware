# Contributor Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Filter the DORA metrics page by contributor — Lead Time by pull-request author, Deployment Frequency by deploy actor.

**Architecture:** The dropdown lists distinct git usernames found in the selected team's synced pull requests, bots excluded. Lead Time reuses `PRFilter.authors`, a field upstream declared and parsed but never applied. Deployment Frequency needs a genuinely new `event_actors` filter on `RepoWorkflowRuns`. No new tables, no identity resolution.

**Tech Stack:** Python 3.9, Flask, SQLAlchemy 2, pytest (backend); Next.js 15 pages router, TypeScript, MUI 5 (frontend).

## Decisions already made — do not revisit

| Decision | Choice |
|---|---|
| Identity | Raw git usernames as synced. No mapping table, no merging of handles. A person using two handles appears twice; that is accepted. |
| Metric scope | Lead Time and Deployment Frequency only. **CFR and MTTR stay team-level** — per-person versions wait for the future Jira integration, because GitHub-issue assignees are too weak a foundation. |
| Involvement | **Authored only.** Reviewers are not included. |
| List source | Distinct authors from the selected team's PRs within the active date range, so the dropdown can never offer someone with no data on screen. |
| Bots | Excluded by default, no UI toggle. |

## Global Constraints

- **No database migration, no new tables.**
- Backend style: `black` formatted, `flake8` clean. Run from `backend/analytics_server` using `./venv/bin/python`.
- Frontend must be `tsc` clean. Local Node is 20 and the project needs 22 — verify inside the `middleware-dev` container, which has Node 22.16.
- Every Clustox-authored change carries a `# CLUSTOX:` or `// CLUSTOX:` comment explaining **why**, per `docs/FORK_STRATEGY.md`.
- Backend suite baseline is **159 passing** (this branch is cut from `main`, which does not include the Jenkins work). Do not break any.
- Bot matching is on the exact `[bot]` suffix plus an explicit list — never a substring match on `bot`, which would exclude a real user called `robotnik`.

## The trap both filter classes share — read before Task 1 or 2

`PRFilter.filter_query` and `WorkflowFilter.filter_query` both end with:

```python
return [
    conditions[x]
    for x in self.__dict__.keys()
    if getattr(self, x) is not None and conditions[x] is not None
]
```

It iterates **every** dataclass field and indexes `conditions` by name. A field with no matching `conditions` key raises `KeyError` the moment that field is set.

This is not hypothetical. `PRFilter.authors` exists today with no `conditions` entry, so sending `authors` in a filter payload raises `KeyError: 'authors'` — verified:

```
PRFilter(authors=['hamad']).filter_query  →  KeyError: 'authors'
```

**Consequence for this plan:** adding a field without adding its `conditions` entry in the same commit reproduces the bug. Both tasks below add both halves together.

---

## File Structure

**Backend — modify:**
- `mhq/store/models/code/filter.py` — apply `authors` in `PRFilter.filter_query`.
- `mhq/store/models/code/workflows/filter.py` — add `event_actors` to `WorkflowFilter`.
- `mhq/service/workflows/workflow_filter.py` — parse `event_actors` from the request.
- `mhq/store/repos/code.py` — contributor query.
- `mhq/api/pull_requests.py` — contributors route.

**Backend — create:**
- `tests/store/models/code/test_pr_filter_authors.py`
- `tests/store/models/code/workflows/test_workflow_filter_actors.py`
- `tests/service/code/test_contributors.py`

**Frontend — create:**
- `web-server/pages/api/internal/team/[team_id]/contributors.ts`
- `web-server/src/components/ContributorFilter.tsx`

**Frontend — modify:**
- `web-server/src/api-helpers/team.ts` — thread `authors` into `pr_filter`.
- `web-server/pages/api/internal/team/[team_id]/dora_metrics.ts` — thread `event_actors`.
- `web-server/pages/dora-metrics/index.tsx` — render the filter.

---

### Task 1: Apply the author filter (and fix the KeyError)

**Files:**
- Modify: `backend/analytics_server/mhq/store/models/code/filter.py`
- Test: `backend/analytics_server/tests/store/models/code/test_pr_filter_authors.py` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: `PRFilter(authors=[...])` yields a `PullRequest.author.in_(authors)` condition. `ParsePRFilterProcessor` already populates the field — no change needed there.

- [ ] **Step 1: Write the failing tests**

Create `backend/analytics_server/tests/store/models/code/test_pr_filter_authors.py`:

```python
from mhq.store.models.code.filter import PRFilter


def test_setting_authors_no_longer_raises():
    # Before this change the conditions dict had no "authors" key, so the
    # filter_query comprehension raised KeyError as soon as the field was set.
    conditions = PRFilter(authors=["hamad-clustox"]).filter_query
    assert len(conditions) == 1


def test_authors_produces_an_author_condition():
    conditions = PRFilter(authors=["hamad-clustox"]).filter_query
    # Compiling to string is the cheapest way to assert the column and operator
    # without a database.
    rendered = str(conditions[0])
    assert "author" in rendered
    assert "IN" in rendered.upper()


def test_no_authors_produces_no_author_condition():
    conditions = PRFilter(base_branches=["^main$"]).filter_query
    assert all("author" not in str(c) for c in conditions)


def test_empty_author_list_is_ignored():
    # An empty list means "no filter selected", not "match nothing".
    conditions = PRFilter(authors=[]).filter_query
    assert conditions == []


def test_existing_filters_are_unaffected():
    # Regression guard: the dashboards everyone already uses must not change.
    conditions = PRFilter(base_branches=["^main$"], excluded_pr_ids=["a"]).filter_query
    assert len(conditions) == 2
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend/analytics_server && ./venv/bin/python -m pytest tests/store/models/code/test_pr_filter_authors.py -v`
Expected: FAIL — the first two with `KeyError: 'authors'`

- [ ] **Step 3: Add the condition**

In `mhq/store/models/code/filter.py`, inside `filter_query`, add this alongside the other inner functions:

```python
        # CLUSTOX: authors was declared on PRFilter and parsed from the request
        # payload upstream, but never added to the conditions dict below -- so
        # sending it raised KeyError rather than filtering. This applies it.
        def _authors_query():
            if not self.authors:
                return None

            return PullRequest.author.in_(self.authors)
```

Then add the entry to the `conditions` dict, as the first key:

```python
        conditions = {
            "authors": _authors_query(),
            "base_branches": _base_branch_query(),
            "repo_filters": _repo_filters_query(),
            "excluded_pr_ids": _excluded_pr_ids_query(),
            "max_cycle_time": _include_prs_below_max_cycle_time(),
            "incident_pr_filters": _incident_pr_filters_query(),
        }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend/analytics_server && ./venv/bin/python -m pytest tests/store/models/code/test_pr_filter_authors.py -v`
Expected: PASS (5 tests)

- [ ] **Step 5: Run the full suite**

Run: `cd backend/analytics_server && ./venv/bin/python -m pytest tests -q`
Expected: 164 passed (159 baseline + 5)

- [ ] **Step 6: Format, lint, commit**

```bash
cd backend/analytics_server
./venv/bin/python -m black mhq/store/models/code/filter.py tests/store/models/code/test_pr_filter_authors.py
./venv/bin/python -m flake8 mhq/store/models/code/filter.py
cd ../..
git add backend/analytics_server/mhq/store/models/code/filter.py \
        backend/analytics_server/tests/store/models/code/test_pr_filter_authors.py
git commit -m "fix(filters): apply the pull request author filter"
```

---

### Task 2: Add the deploy-actor filter

**Files:**
- Modify: `backend/analytics_server/mhq/store/models/code/workflows/filter.py`
- Modify: `backend/analytics_server/mhq/service/workflows/workflow_filter.py`
- Test: `backend/analytics_server/tests/store/models/code/workflows/test_workflow_filter_actors.py` (create)

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `WorkflowFilter(event_actors=[...])` yields a `RepoWorkflowRuns.event_actor.in_(...)` condition; `ParseWorkflowFilterProcessor` reads `event_actors` from the request dict.

- [ ] **Step 1: Write the failing tests**

Create `backend/analytics_server/tests/store/models/code/workflows/test_workflow_filter_actors.py`:

```python
from mhq.service.workflows.workflow_filter import ParseWorkflowFilterProcessor
from mhq.store.models.code.workflows.filter import WorkflowFilter


def test_event_actors_produces_an_actor_condition():
    conditions = WorkflowFilter(event_actors=["hamad-clustox"]).filter_query
    assert len(conditions) == 1
    rendered = str(conditions[0])
    assert "event_actor" in rendered
    assert "IN" in rendered.upper()


def test_no_event_actors_produces_no_actor_condition():
    conditions = WorkflowFilter(head_branches=["^main$"]).filter_query
    assert all("event_actor" not in str(c) for c in conditions)


def test_empty_actor_list_is_ignored():
    assert WorkflowFilter(event_actors=[]).filter_query == []


def test_existing_workflow_filters_are_unaffected():
    # Regression guard for the deployment frequency everyone already sees.
    conditions = WorkflowFilter(head_branches=["^main$"]).filter_query
    assert len(conditions) == 1


def test_parser_reads_event_actors_from_the_request():
    parsed = ParseWorkflowFilterProcessor().apply({"event_actors": ["hamad-clustox"]})
    assert parsed.event_actors == ["hamad-clustox"]


def test_parser_defaults_event_actors_to_none():
    parsed = ParseWorkflowFilterProcessor().apply({})
    assert parsed.event_actors is None
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend/analytics_server && ./venv/bin/python -m pytest tests/store/models/code/workflows/test_workflow_filter_actors.py -v`
Expected: FAIL — `TypeError: __init__() got an unexpected keyword argument 'event_actors'`

- [ ] **Step 3: Add the field and its condition together**

In `mhq/store/models/code/workflows/filter.py`, change the `WorkflowFilter` dataclass. Add the field **and** the conditions entry in this same step — adding one without the other reproduces the `KeyError` described at the top of this plan:

```python
@dataclass
class WorkflowFilter:
    head_branches: List[str] = None
    repo_filters: Dict[str, Dict] = None
    # CLUSTOX: who triggered the deployment. Lead Time filters on the pull
    # request author; deployments have no author, so the nearest equivalent is
    # the actor who ran the build.
    event_actors: List[str] = None

    @property
    def filter_query(self) -> List:
        def _head_branches_query():
            if not self.head_branches:
                return None

            return or_(
                RepoWorkflowRuns.head_branch.op("~")(term)
                for term in self.head_branches
            )

        def _repo_filters_query():
            if not self.repo_filters:
                return None

            return or_(
                RepoWorkflowFilter(repo_id, repo_filters).filter_query
                for repo_id, repo_filters in self.repo_filters.items()
                if repo_filters
            )

        # CLUSTOX: runs with a null event_actor -- Jenkins builds without the
        # git plugin, for instance -- are excluded by IN, so per-contributor
        # deployment counts will not sum to the team total. That is intended:
        # an unattributable deploy belongs to nobody.
        def _event_actors_query():
            if not self.event_actors:
                return None

            return RepoWorkflowRuns.event_actor.in_(self.event_actors)

        conditions = {
            "head_branches": _head_branches_query(),
            "repo_filters": _repo_filters_query(),
            "event_actors": _event_actors_query(),
        }
        return [
            conditions[x]
            for x in self.__dict__.keys()
            if getattr(self, x) is not None and conditions[x] is not None
        ]
```

- [ ] **Step 4: Parse it from the request**

In `mhq/service/workflows/workflow_filter.py`, extend `ParseWorkflowFilterProcessor.apply`:

```python
    def apply(self, workflow_filter: Dict = None) -> WorkflowFilter:
        workflow_filter = workflow_filter or {}
        head_branches: List[str] = self._parse_head_branches(workflow_filter)
        repo_filters: Dict[str, Dict] = self._parse_repo_filters(workflow_filter)
        # CLUSTOX: contributor filter for deployment frequency.
        event_actors: List[str] = workflow_filter.get("event_actors")

        return WorkflowFilter(
            head_branches=head_branches,
            repo_filters=repo_filters,
            event_actors=event_actors,
        )
```

Note the added `workflow_filter = workflow_filter or {}` guard — the signature defaults to `None` and the existing body would raise `AttributeError` on a bare `.get`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend/analytics_server && ./venv/bin/python -m pytest tests/store/models/code/workflows/test_workflow_filter_actors.py -v`
Expected: PASS (6 tests)

- [ ] **Step 6: Run the full suite, format, lint, commit**

```bash
cd backend/analytics_server
./venv/bin/python -m pytest tests -q          # expect 170 passed
./venv/bin/python -m black mhq/store/models/code/workflows/filter.py mhq/service/workflows/workflow_filter.py tests/store/models/code/workflows/test_workflow_filter_actors.py
./venv/bin/python -m flake8 mhq/store/models/code/workflows/filter.py mhq/service/workflows/workflow_filter.py
cd ../..
git add backend/analytics_server/mhq/store/models/code/workflows/filter.py \
        backend/analytics_server/mhq/service/workflows/workflow_filter.py \
        backend/analytics_server/tests/store/models/code/workflows/test_workflow_filter_actors.py
git commit -m "feat(filters): filter deployments by the actor who triggered them"
```

---

### Task 3: Contributor list query and route

**Files:**
- Modify: `backend/analytics_server/mhq/store/repos/code.py`
- Modify: `backend/analytics_server/mhq/api/pull_requests.py`
- Test: `backend/analytics_server/tests/service/code/test_contributors.py` (create)

**Interfaces:**
- Consumes: nothing from Tasks 1-2.
- Produces:
  - `is_bot_author(username: str) -> bool` in `mhq/utils/string.py`
  - `CodeRepoService.get_contributors_for_repos(repo_ids: List[str], from_time, to_time) -> List[Tuple[str, int]]` returning `(author, pr_count)` ordered by count descending
  - `GET /teams/<team_id>/contributors?from_time=&to_time=` returning `[{"username": str, "pr_count": int}]`

- [ ] **Step 1: Write the failing bot-exclusion tests**

Create `backend/analytics_server/tests/service/code/test_contributors.py`:

```python
from mhq.utils.string import is_bot_author


def test_bracket_bot_suffix_is_a_bot():
    assert is_bot_author("dependabot[bot]") is True
    assert is_bot_author("renovate[bot]") is True


def test_known_bot_names_are_bots():
    assert is_bot_author("dependabot") is True
    assert is_bot_author("github-actions") is True


def test_a_human_whose_name_contains_bot_is_not_a_bot():
    # Substring matching on "bot" would wrongly exclude these people.
    assert is_bot_author("robotnik") is False
    assert is_bot_author("botond") is False
    assert is_bot_author("abbott") is False


def test_none_and_empty_are_not_bots():
    assert is_bot_author(None) is False
    assert is_bot_author("") is False


def test_matching_is_case_insensitive():
    assert is_bot_author("Dependabot[Bot]") is True
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend/analytics_server && ./venv/bin/python -m pytest tests/service/code/test_contributors.py -v`
Expected: FAIL — `ImportError: cannot import name 'is_bot_author'`

- [ ] **Step 3: Write the bot predicate**

Append to `backend/analytics_server/mhq/utils/string.py`:

```python
# CLUSTOX: bot accounts author real pull requests, so they appear in the
# contributor list unless excluded. Matching is on the exact "[bot]" suffix
# plus an explicit list -- a substring match on "bot" would exclude real
# people called robotnik or abbott.
KNOWN_BOT_AUTHORS = frozenset(
    {
        "dependabot",
        "renovate",
        "github-actions",
        "snyk-bot",
        "greenkeeper",
        "codecov",
        "imgbot",
    }
)


def is_bot_author(username: Optional[str]) -> bool:
    if not username:
        return False

    lowered = username.lower()
    return lowered.endswith("[bot]") or lowered in KNOWN_BOT_AUTHORS
```

Add `from typing import Optional` to that file's imports if it is not already present.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend/analytics_server && ./venv/bin/python -m pytest tests/service/code/test_contributors.py -v`
Expected: PASS (5 tests)

- [ ] **Step 5: Add the repository query**

Append to `CodeRepoService` in `backend/analytics_server/mhq/store/repos/code.py`:

```python
    # CLUSTOX: distinct authors for the contributor filter, scoped to the
    # repos and window currently on screen so the dropdown can never offer
    # someone with no data in view.
    def get_contributors_for_repos(
        self, repo_ids: List[str], from_time: datetime, to_time: datetime
    ) -> List[Tuple[str, int]]:
        if not repo_ids:
            return []

        rows = (
            self._db.session.query(
                PullRequest.author, func.count(PullRequest.id).label("pr_count")
            )
            .filter(
                PullRequest.repo_id.in_(repo_ids),
                PullRequest.author.isnot(None),
                PullRequest.state_changed_at.between(from_time, to_time),
            )
            .group_by(PullRequest.author)
            .order_by(func.count(PullRequest.id).desc())
            .all()
        )

        return [(author, count) for author, count in rows if not is_bot_author(author)]
```

Add whatever of `datetime`, `Tuple`, `func`, and `is_bot_author` that file does not already import. Check its existing imports first rather than adding duplicates.

- [ ] **Step 6: Add the Flask route**

Append to `backend/analytics_server/mhq/api/pull_requests.py`. The decorator stack below matches `get_lead_time_prs` in the same file (line 60) — `@queryschema` with a voluptuous `Schema`, coercing the ISO timestamps:

```python
# CLUSTOX: contributor list backing the DORA metrics filter. Scoped to the
# team's repos and the window on screen, so the dropdown cannot offer someone
# with no data in view.
@app.route("/teams/<team_id>/contributors", methods={"GET"})
@queryschema(
    Schema(
        {
            Required("from_time"): All(str, Coerce(datetime.fromisoformat)),
            Required("to_time"): All(str, Coerce(datetime.fromisoformat)),
        }
    ),
)
def get_team_contributors(team_id: str, from_time: datetime, to_time: datetime):
    query_validator = get_query_validator()
    team: Team = query_validator.team_validator(team_id)

    repos = CodeRepoService().get_team_repos(team)
    repo_ids = [str(repo.id) for repo in repos]

    contributors = CodeRepoService().get_contributors_for_repos(
        repo_ids, from_time, to_time
    )
    return [
        {"username": username, "pr_count": pr_count}
        for username, pr_count in contributors
    ]
```

`Schema`, `Required`, `All`, `Coerce`, `queryschema`, `get_query_validator`, `Team` and `CodeRepoService` are all already imported by that file — confirm rather than re-import.

- [ ] **Step 7: Run the full suite, format, lint, commit**

```bash
cd backend/analytics_server
./venv/bin/python -m pytest tests -q          # expect 175 passed
./venv/bin/python -m black mhq/utils/string.py mhq/store/repos/code.py mhq/api/pull_requests.py tests/service/code/test_contributors.py
./venv/bin/python -m flake8 mhq/utils/string.py mhq/store/repos/code.py mhq/api/pull_requests.py
cd ../..
git add backend/analytics_server/mhq/utils/string.py \
        backend/analytics_server/mhq/store/repos/code.py \
        backend/analytics_server/mhq/api/pull_requests.py \
        backend/analytics_server/tests/service/code/test_contributors.py
git commit -m "feat(contributors): list a team's pull request authors, bots excluded"
```

---

### Task 4: Thread the filter through the BFF

**Files:**
- Create: `web-server/pages/api/internal/team/[team_id]/contributors.ts`
- Modify: `web-server/src/api-helpers/team.ts`
- Modify: `web-server/pages/api/internal/team/[team_id]/dora_metrics.ts`

**Interfaces:**
- Consumes: the Flask route from Task 3.
- Produces:
  - `GET /api/internal/team/{team_id}/contributors?from_date=&to_date=` → `[{username, pr_count}]`
  - `updatePrFilterParams(teamId, params, filters)` accepts `filters.authors?: string[]` and emits it inside `pr_filter`
  - `dora_metrics.ts` forwards `event_actors` into the workflow filter payload

- [ ] **Step 1: Create the contributors BFF route**

Create `web-server/pages/api/internal/team/[team_id]/contributors.ts`:

```ts
import * as yup from 'yup';

import { Endpoint } from '@/api-helpers/global';
import { internal } from '@/api-helpers/axios';

// CLUSTOX: backs the contributor filter on the DORA metrics page. team_id is
// validated by Endpoint.serve(), which asserts the caller may read that team.
const pathSchema = yup.object().shape({
  team_id: yup.string().uuid().required()
});

const getSchema = yup.object().shape({
  team_id: yup.string().uuid().required(),
  from_date: yup.date().required(),
  to_date: yup.date().required()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  const { team_id, from_date, to_date } = req.payload;

  const contributors = await internal.get(`/teams/${team_id}/contributors`, {
    params: { from_time: from_date, to_time: to_date }
  });

  res.send(contributors.data);
});

export default endpoint.serve();
```

Note `pathSchema` contains only `team_id` — the same construction bug fixed during the Jenkins work, where passing a method-specific schema as the path schema made every other method a permanent 400.

- [ ] **Step 2: Accept authors in the PR filter builder**

In `web-server/src/api-helpers/team.ts`, change `updatePrFilterParams`:

```ts
export const updatePrFilterParams = async <T extends {} = {}>(
  _teamId: ID,
  params: T,
  filters?: Partial<{
    branches: string;
    repo_filters: RepoFilterConfig;
    // CLUSTOX: contributor filter -- git usernames, as synced.
    authors: string[];
  }>
) => {
  const updatedParams = {
    base_branches: filters?.branches?.split(','),
    repo_filters: filters?.repo_filters,
    authors: filters?.authors?.length ? filters.authors : undefined
  };
  const reducedParams = reject(isNil, updatedParams);
  const pr_filter = equals({}, reducedParams) ? null : reducedParams;

  return reject(isNil, {
    ...params,
    pr_filter
  }) as T & { pr_filter?: Partial<typeof updatedParams> };
};
```

The `?.length ? ... : undefined` matters: an empty array must become `undefined` so `reject(isNil, ...)` drops it. Sending `authors: []` would filter to nobody.

- [ ] **Step 3: Accept event actors in the workflow filter builder**

In `web-server/src/utils/filterUtils.ts`, extend `getWorkFlowFiltersAsPayloadForSingleTeam` (line 84). The new parameter is optional, so the other caller — `pages/api/internal/team/[team_id]/deployment_analytics.ts` — is unaffected:

```ts
export const getWorkFlowFiltersAsPayloadForSingleTeam = async (params: {
  orgId: ID;
  teamId: ID;
  // CLUSTOX: contributor filter. Deployments have no author, so the nearest
  // equivalent is the actor who triggered the run.
  eventActors?: string[];
}) => {
  const { orgId, teamId, eventActors } = params;
  const teamProdBranchesMap =
    await getAllTeamsReposProdBranchesForOrgAsMap(orgId);
  const filter = Object.fromEntries(
    Object.entries(workFlowFiltersFromTeamProdBranches(teamProdBranchesMap))
  )[teamId];

  if (!eventActors?.length) return filter;
  return { ...filter, event_actors: eventActors };
};
```

Add a case to the existing suite at `web-server/src/utils/__tests__/filterUtils.test.ts` (its `getWorkFlowFiltersAsPayloadForSingleTeam` describe block starts at line 264) asserting that passing `eventActors` adds `event_actors` to the payload, and that omitting it leaves the payload unchanged.

- [ ] **Step 4: Thread the selection through the DORA route**

In `web-server/pages/api/internal/team/[team_id]/dora_metrics.ts`, add `authors: yup.array().of(yup.string()).optional()` to the request schema, destructure it alongside the other params, then change the `Promise.all` block at line 66:

```ts
  const [prFilters, workflowFilters] = await Promise.all([
    updatePrFilterParams(teamId, {}, { ...branchAndRepoFilters, authors }).then(
      ({ pr_filter }) => ({
        pr_filter
      })
    ),
    getWorkFlowFiltersAsPayloadForSingleTeam({
      orgId: org_id,
      teamId: teamId,
      eventActors: authors
    })
  ]);
```

The same `authors` value feeds both builders — that is what makes one control drive both metrics.

- [ ] **Step 5: Run the frontend unit tests**

Run: `docker exec middleware-dev sh -c 'cd /app/web-server && yarn test --testPathPattern=filterUtils'`
Expected: PASS, including the two cases added in Step 3

- [ ] **Step 6: Verify types compile**

```bash
docker cp web-server/pages/api/internal/team/\[team_id\]/contributors.ts middleware-dev:/app/web-server/pages/api/internal/team/\[team_id\]/contributors.ts
docker cp web-server/src/api-helpers/team.ts middleware-dev:/app/web-server/src/api-helpers/team.ts
docker cp web-server/src/utils/filterUtils.ts middleware-dev:/app/web-server/src/utils/filterUtils.ts
docker cp web-server/pages/api/internal/team/\[team_id\]/dora_metrics.ts middleware-dev:/app/web-server/pages/api/internal/team/\[team_id\]/dora_metrics.ts
docker exec middleware-dev sh -c 'cd /app/web-server && ./node_modules/.bin/tsc --noEmit 2>&1 | grep -c "error TS"'
```
Expected: `0`

The container now runs this branch, so these files overwrite their own current versions — no restore step is needed, but re-copy from git if you abandon a change.

- [ ] **Step 7: Commit**

```bash
git add web-server/pages/api/internal/team/\[team_id\]/contributors.ts \
        web-server/src/api-helpers/team.ts \
        web-server/src/utils/filterUtils.ts \
        web-server/src/utils/__tests__/filterUtils.test.ts \
        web-server/pages/api/internal/team/\[team_id\]/dora_metrics.ts
git commit -m "feat(contributors): expose the contributor list and thread the filter"
```

---

### Task 5: Contributor dropdown

**Files:**
- Create: `web-server/src/components/ContributorFilter.tsx`
- Modify: `web-server/pages/dora-metrics/index.tsx`

**Interfaces:**
- Consumes: `GET /api/internal/team/{team_id}/contributors` from Task 4.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Build the dropdown**

Create `web-server/src/components/ContributorFilter.tsx`: an MUI `Autocomplete` (multiple, `size="small"`) fetching from `/api/internal/team/${teamId}/contributors` whenever `teamId`, `fromDate` or `toDate` change. Each option shows the username with its PR count as secondary text. Follow the styling conventions in `web-server/src/components/ClustoxWorkspaceMetrics.tsx`.

Required behaviours:

- Selection is held in the URL query string, so the filter survives a refresh and can be shared.
- When the fetched list no longer contains a selected username — because the team or date range changed — drop that selection and show a brief inline notice. Do not silently clear it; the numbers would move with no visible cause.
- While loading, disable the control rather than showing an empty list, which reads as "no contributors".
- On fetch failure, disable the control and show the error inline. The dashboard must still render unfiltered — the filter is an enhancement, and losing it should not cost the page.
- When the list is empty, disable the control with the text "No contributors in this range".

- [ ] **Step 2: Render it and label the metrics**

In `web-server/pages/dora-metrics/index.tsx`, render `ContributorFilter` alongside the existing selectors and pass the selection into the metrics requests.

When a contributor is selected, each affected card gains a qualifier:

- Lead Time: `authored by <username>`
- Deployment Frequency: `deployed by <username>`

These wordings are deliberate and load-bearing. One control drives two different relationships — the PR author for Lead Time, the deploy actor for Deployment Frequency — and those are often different people. Without the qualifiers, a user seeing the two numbers disagree will reasonably conclude the page is broken.

Change Failure Rate and MTTR are **not** filtered. When a contributor is selected, show on both: `team-wide — per-contributor arrives with Jira`.

- [ ] **Step 3: Verify types and lint**

```bash
docker cp web-server/src/components/ContributorFilter.tsx middleware-dev:/app/web-server/src/components/ContributorFilter.tsx
docker cp web-server/pages/dora-metrics/index.tsx middleware-dev:/app/web-server/pages/dora-metrics/index.tsx
docker exec middleware-dev sh -c 'cd /app/web-server && ./node_modules/.bin/tsc --noEmit 2>&1 | grep -c "error TS"'
```
Expected: `0`

- [ ] **Step 4: Verify by hand**

The container runs this branch, so the running app at `http://localhost:3333/dora-metrics` picks these up. Confirm:

1. The dropdown lists contributors with PR counts, no `[bot]` entries.
2. Selecting one changes Lead Time and Deployment Frequency; CFR and MTTR do not move.
3. Both filtered cards show their qualifier.
4. Refreshing preserves the selection.
5. Narrowing the date range until the selected contributor has no PRs clears the selection with a notice.

- [ ] **Step 5: Commit**

```bash
git add web-server/src/components/ContributorFilter.tsx \
        web-server/pages/dora-metrics/index.tsx
git commit -m "feat(contributors): add the contributor filter to dora metrics"
```

---

## Final verification

- [ ] `cd backend/analytics_server && ./venv/bin/python -m pytest tests -q` — expect 175 passed
- [ ] `./venv/bin/python -m black --check mhq && ./venv/bin/python -m flake8 mhq` — clean
- [ ] `docker exec middleware-dev sh -c 'cd /app/web-server && ./node_modules/.bin/tsc --noEmit'` — 0 errors
- [ ] Unfiltered dashboards are byte-identical to before this work — the regression tests in Tasks 1 and 2 cover the query layer, but confirm in the running app too

**The test that matters most** is the one asserting the numbers *change*. The defect being fixed here is a filter that was accepted and never applied; a test that only checks the request succeeds would have passed against the broken behaviour.
