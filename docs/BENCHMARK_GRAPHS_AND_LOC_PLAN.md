# Benchmark Graphs and LOC Metric Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dashed benchmark rule with a shaded target band drawn inside each card's trend, and add lines of code as a fifth metric in a 2×3 grid.

**Architecture:** LOC is aggregated in Flask from `PullRequest.meta.code_stats` (already synced) through the existing `PRFilter`, served on two routes mirroring the lead-time pair, and delivered on the existing `dora_metrics` BFF response. The band is drawn by `chartjs-plugin-annotation`, already a dependency and already registered but unused, so it positions in data space instead of by CSS percentage.

**Tech Stack:** Flask 3, SQLAlchemy 2, Postgres 15, Next.js 15 (pages router), MUI 5, chart.js 3.9 + chartjs-plugin-annotation 2.0.

**Spec:** `docs/BENCHMARK_GRAPHS_AND_LOC.md`. **Predecessor:** `docs/BENCHMARKS.md`.

## Global Constraints

- **No database migration and no new tables.** `Settings.data` is JSONB and every enum column is `character varying`.
- Backend tests must pass. Baseline is **303**. Run `cd backend/analytics_server && ./venv/bin/python -m pytest` — that venv is the only working one; the repo-root venv lacks Flask.
- Frontend must typecheck: `npx tsc --noEmit`. Host `node_modules` is not installed — run inside the `middleware-dev` container.
- `black` and `flake8` clean on changed Python files.
- `# CLUSTOX:` / `// CLUSTOX:` comments explain **why**, never what.
- **Never run any `docker compose` command.** Copying files into the container and reloading a process is fine; rebuilding the image is not authorised.
- LOC counts **merged PRs only**.
- Units: lead time and MTTR **seconds**, deployment frequency **per week**, CFR **percent**, LOC benchmark **lines per PR**.
- **`0` is a deliberate target, never "absent".** Every check must be `is not None` / `!= null`, never truthiness.
- Commit in logical chunks. Do not amend or force-push.

---

### Task 1: LOC aggregation service and Flask routes

**Files:**
- Create: `backend/analytics_server/mhq/service/code/loc.py`
- Modify: `backend/analytics_server/mhq/api/pull_requests.py` (add routes after the `lead_time/trends` route ending line 175)
- Test: `backend/analytics_server/tests/service/code/test_loc.py`

**Interfaces:**
- Consumes: `PRFilter` (`mhq/service/code/pr_filter.py`), `PullRequest.additions` / `.deletions` / `.changed_files` (`mhq/store/models/code/pull_requests.py:59-68`), `get_query_validator()`.
- Produces: `LOCMetrics` dataclass and `get_team_loc_metrics(team_id, interval, pr_filter) -> LOCMetrics`, plus `get_team_loc_trends(...) -> Dict[datetime, LOCMetrics]`. Task 2 consumes the two routes.

Model the service and both routes on the lead-time pair in the same files — `/teams/<team_id>/lead_time` (line 98) and `/teams/<team_id>/lead_time/trends` (line 135). Read them first and match their filter parsing, `interval` handling and decorators exactly.

- [ ] **Step 1: Write the failing test**

```python
# tests/service/code/test_loc.py
from mhq.service.code.loc import LOCMetrics, aggregate_loc


def _pr(additions, deletions, state="MERGED"):
    class FakePR:
        pass
    pr = FakePR()
    pr.additions = additions
    pr.deletions = deletions
    pr.state = state
    return pr


def test_aggregate_sums_additions_and_deletions():
    result = aggregate_loc([_pr(10, 5), _pr(20, 1)])
    assert result.additions == 30
    assert result.deletions == 6


def test_avg_pr_size_is_gross_lines_over_pr_count():
    # (10+5 + 20+1) / 2 == 18
    result = aggregate_loc([_pr(10, 5), _pr(20, 1)])
    assert result.avg_pr_size == 18


def test_avg_pr_size_is_zero_not_a_crash_when_no_prs():
    # A team with no merged PRs in range must not divide by zero, and must not
    # report None -- the card would then need a third empty state.
    result = aggregate_loc([])
    assert result == LOCMetrics(additions=0, deletions=0, avg_pr_size=0)
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd backend/analytics_server && ./venv/bin/python -m pytest tests/service/code/test_loc.py -v`
Expected: FAIL, `ModuleNotFoundError: No module named 'mhq.service.code.loc'`

- [ ] **Step 3: Write the service**

```python
# mhq/service/code/loc.py
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional

from mhq.service.code.pr_filter import PRFilter
from mhq.store.models.code.pull_requests import PullRequest
from mhq.store.repos.code import CodeRepoService
from mhq.utils.time import Interval


@dataclass
class LOCMetrics:
    additions: int = 0
    deletions: int = 0
    # CLUSTOX: gross lines per merged PR, not net. A 2,000-line refactor that
    # nets to zero is still 2,000 lines to review, and PR size is benchmarked
    # precisely because it predicts review latency.
    avg_pr_size: int = 0


def aggregate_loc(prs: List[PullRequest]) -> LOCMetrics:
    if not prs:
        # Zero, never None: the card would otherwise need a third empty state
        # on top of "no data" and "no target".
        return LOCMetrics()

    additions = sum(pr.additions for pr in prs)
    deletions = sum(pr.deletions for pr in prs)
    return LOCMetrics(
        additions=additions,
        deletions=deletions,
        avg_pr_size=round((additions + deletions) / len(prs)),
    )
```

Then add `get_team_loc_metrics` and `get_team_loc_trends` alongside, fetching merged PRs through `CodeRepoService` with the supplied `PRFilter` — mirror how `mhq/service/code/lead_time.py` obtains its PRs rather than writing a new query.

- [ ] **Step 4: Run the tests**

Run: `cd backend/analytics_server && ./venv/bin/python -m pytest tests/service/code/test_loc.py -v`
Expected: PASS, 3 tests.

- [ ] **Step 5: Add the two routes**

In `mhq/api/pull_requests.py`, after the trends route:

```python
@app.route("/teams/<team_id>/loc", methods={"GET"})
@queryschema(
    Schema(
        {
            Required("from_time"): All(str, Coerce(datetime.fromisoformat)),
            Required("to_time"): All(str, Coerce(datetime.fromisoformat)),
            Optional("pr_filter"): All(str, Coerce(json.loads)),
        }
    ),
)
def get_team_loc(team_id: str, from_time: datetime, to_time: datetime, pr_filter: Dict = None):
    ...
```

Match the surrounding routes' validator and filter-parsing calls exactly; do not invent a new pattern.

- [ ] **Step 6: Verify over real HTTP, not only in tests**

```
docker exec middleware-dev sh -lc 'curl -s -H "X-Internal-Token: $INTERNAL_API_TOKEN" "http://localhost:9696/teams/754e3764-cb0a-4bc8-9e63-ff887fd33ebd/loc?from_time=2026-05-20T00:00:00&to_time=2026-08-12T00:00:00"'
```

Copy the changed `.py` files in with `docker cp` and reload gunicorn first (`kill -HUP` the master on :9696). Paste the actual output into your report. The database has 431 PRs with `code_stats`, so a zero result means something is wrong.

- [ ] **Step 7: Commit**

```bash
git add backend/analytics_server/mhq/service/code/loc.py backend/analytics_server/mhq/api/pull_requests.py backend/analytics_server/tests/service/code/test_loc.py
git commit -m "feat(loc): aggregate lines of code from merged pull requests"
```

---

### Task 2: Deliver LOC on the metrics response

**Files:**
- Modify: `web-server/src/utils/cockpitMetricUtils.ts` (add beside `fetchLeadTimeStats`, line 43)
- Modify: `web-server/pages/api/internal/team/[team_id]/dora_metrics.ts` (the `Promise.all` at line ~65 and the `res.send` at ~217)
- Modify: `web-server/src/types/resources.ts`
- Test: `web-server/pages/api/internal/team/[team_id]/__tests__/dora_metrics.test.ts` (extend the existing shape test)

**Interfaces:**
- Consumes: Task 1's two routes.
- Produces: `loc_stats` on the `dora_metrics` response, reaching `state.doraMetrics.metrics_summary.loc_stats`. Task 6 renders it.

- [ ] **Step 1: Add the fetcher**

```ts
export const fetchLocStats = async (params: {
  teamId: ID;
  from_date: DateString;
  to_date: DateString;
  pr_filter?: PRFilter;
}) => { /* mirror fetchLeadTimeStats exactly, including its previous-period call */ };
```

- [ ] **Step 2: Wire it into the existing Promise.all**

```ts
const [branchAndRepoFilters, unsyncedRepos, benchmarks, locStats] = await Promise.all([
  // ...existing three...
  // CLUSTOX: same soft-failure contract as fetchTeamBenchmarks above -- a
  // rejection here would blank all five cards over one optional metric.
  fetchLocStats({ teamId, from_date, to_date }).catch(() => undefined)
]);
```

and add `loc_stats: locStats` to the `res.send({...})` object.

- [ ] **Step 3: Pin the contract in a test**

Assert the response carries `loc_stats` **and** that the four existing `*_stats` keys are still present and unchanged. A test that only checks the new key would not catch the regression that matters.

- [ ] **Step 4: Typecheck and commit**

```bash
git add web-server/src/utils/cockpitMetricUtils.ts "web-server/pages/api/internal/team/[team_id]/dora_metrics.ts" web-server/src/types/resources.ts
git commit -m "feat(loc): send loc_stats on the dora metrics response"
```

---

### Task 3: Register `lines_of_code` as a fifth benchmark metric

**Files — every site that names a metric explicitly. All seven backend, all six frontend:**

Backend:
- `mhq/service/settings/models.py:67` — add `lines_of_code: Optional[float] = None`
- `mhq/service/settings/benchmarks.py:26` — add to `BENCHMARK_METRICS`
- `mhq/service/settings/configuration_settings.py:85` and `:224` — both `data.get(...)` adapters
- `mhq/service/settings/configuration_settings.py:308` — the to-dict adapter
- `mhq/api/resources/settings_resource.py:82` — the API response adapter
- `mhq/service/settings/default_settings_data.py:51` — add `"lines_of_code": None`

Frontend:
- `src/utils/benchmarks.ts:16` — the `BenchmarkMetric` union
- `src/utils/benchmarks.ts:42` — `LOWER_IS_BETTER` (LOC **is** lower-is-better)
- `src/utils/benchmarks.ts:66` — `formatBenchmarkValue` (`${value} lines`)
- `src/components/BenchmarkSettingsForm.tsx:37,44,51,58,68,113` — `METRICS`, `DURATION_METRICS` (LOC is **not** one), label `Average PR size`, unit `lines`, empty value, validation switch
- `pages/api/clustox/benchmarks/global.ts:15` — `lines_of_code: yup.number().min(0).nullable().optional()`

**Interfaces:** Produces `benchmarks.lines_of_code` with the same `{target, source}` shape as the other four. Task 5 draws its band.

- [ ] **Step 1: Write the failing test**

```python
def test_lines_of_code_resolves_like_every_other_metric():
    resolved = resolve_benchmarks(
        BenchmarkSetting(lines_of_code=200),
        BenchmarkSetting(lines_of_code=400, lead_time=86400),
    )
    assert resolved["lines_of_code"] == {"target": 200, "source": "team"}
    assert resolved["lead_time"] == {"target": 86400, "source": "global"}


def test_zero_lines_of_code_is_a_real_target():
    resolved = resolve_benchmarks(BenchmarkSetting(lines_of_code=0), None)
    assert resolved["lines_of_code"] == {"target": 0, "source": "team"}
```

- [ ] **Step 2: Run it, watch it fail**

Expected: `KeyError: 'lines_of_code'`.

- [ ] **Step 3: Make the change at all thirteen sites, then run the whole suite**

Run: `cd backend/analytics_server && ./venv/bin/python -m pytest`
Expected: 303 + your new tests, zero failures. A failure elsewhere means you missed an adapter.

- [ ] **Step 4: Verify the round trip over HTTP**

`PUT` a team benchmark containing only `lines_of_code`, then `GET /teams/<id>/benchmarks` and confirm it comes back `source: "team"` while the other four report `global` or `null`. Paste the output into your report.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(benchmarks): add lines_of_code as a fifth benchmark metric"
```

---

### Task 4: The target band

**Files:**
- Create: `web-server/src/utils/benchmarkBand.ts`
- Delete: `web-server/src/components/BenchmarkTargetLine.tsx`
- Test: `web-server/src/utils/__tests__/benchmarkBand.test.ts`

**Interfaces:**
- Consumes: `LOWER_IS_BETTER` from `src/utils/benchmarks.ts`.
- Produces: `benchmarkBandOptions({metric, target, actual, values, theme})` returning a partial chart.js options object — the `annotation` plugin block plus the `y.suggestedMax` override. Task 5 merges it into each card's `chartOptions`.

`chartjs-plugin-annotation` is imported and registered at `src/components/Chart2/InternalChart2.tsx:9,33` and used nowhere. Cards hide both axes (`display: false`), which does not affect annotations — they position in data space regardless.

- [ ] **Step 1: Write the failing test**

```ts
describe('benchmarkBandOptions', () => {
  it('extends the y scale so a target above the data is not clipped', () => {
    const opts = benchmarkBandOptions({
      metric: 'lead_time', target: 100, actual: 20, values: [10, 20, 30]
    });
    // Without this the band is drawn off-canvas and the card looks unchanged.
    expect(opts.scales.y.suggestedMax).toBeGreaterThanOrEqual(100);
  });

  it('covers target down to zero when lower is better', () => {
    const { yMin, yMax } = boxOf(benchmarkBandOptions({
      metric: 'lead_time', target: 100, actual: 20, values: [10, 20, 30]
    }));
    expect(yMin).toBe(0);
    expect(yMax).toBe(100);
  });

  it('covers target upward for deployment frequency', () => {
    const { yMin } = boxOf(benchmarkBandOptions({
      metric: 'deployment_frequency', target: 5, actual: 9, values: [4, 9]
    }));
    expect(yMin).toBe(5);
  });

  it('tints success when the actual value is on the good side', () => {
    const opts = benchmarkBandOptions({
      metric: 'lead_time', target: 100, actual: 20, values: [20]
    });
    expect(colorOf(opts)).toMatch(/success/);
  });

  it('never returns red', () => {
    const opts = benchmarkBandOptions({
      metric: 'lead_time', target: 10, actual: 900, values: [900]
    });
    expect(colorOf(opts)).not.toMatch(/error|red/);
  });
});
```

- [ ] **Step 2: Run it, watch it fail**

Run: `docker exec middleware-dev sh -lc 'cd /app/web-server && npx jest src/utils/__tests__/benchmarkBand.test.ts'`

- [ ] **Step 3: Implement**

```ts
// CLUSTOX: replaces BenchmarkTargetLine, a CSS-positioned div whose height was
// target / max(target, ...values). A deployment-frequency target of 1 against
// a series topping 35 landed at 3% -- visually identical to the card's bottom
// border. An annotation is positioned in data space by chart.js itself, so it
// cannot disagree with the series it is drawn over.
export const benchmarkBandOptions = ({ metric, target, actual, values, theme }) => {
  const lowerIsBetter = LOWER_IS_BETTER.has(metric);
  const dataMax = Math.max(0, ...values.filter(Number.isFinite));
  // The target must be inside the scale or the band is clipped off-canvas.
  const suggestedMax = Math.max(dataMax, target) * 1.1;
  const onGoodSide = lowerIsBetter ? actual <= target : actual >= target;
  // Never red: a missed internal goal is not an error (spec, "The graph").
  const tone = onGoodSide ? theme.colors.success : theme.colors.warning;
  return {
    scales: { y: { suggestedMax } },
    plugins: {
      annotation: {
        annotations: {
          band: {
            type: 'box',
            yMin: lowerIsBetter ? 0 : target,
            yMax: lowerIsBetter ? target : suggestedMax,
            backgroundColor: alpha(tone, 0.12),
            borderWidth: 0
          },
          targetLine: {
            type: 'line',
            yMin: target,
            yMax: target,
            borderColor: alpha(tone, 0.6),
            borderWidth: 1
          }
        }
      }
    }
  };
};
```

- [ ] **Step 4: Run the tests, then delete the old component**

Confirm no imports of `BenchmarkTargetLine` remain: `grep -rn BenchmarkTargetLine web-server/src` must return nothing.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(benchmarks): draw the target as a shaded band in data space"
```

---

### Task 5: Apply the band to the four existing cards

**Files:**
- Modify: `src/content/DoraMetrics/DoraCards/ChangeTimeCard.tsx` (chartOptions line 36, chart line 322)
- Modify: `src/content/DoraMetrics/DoraCards/WeeklyDeliveryVolumeCard.tsx`
- Modify: `src/content/DoraMetrics/DoraCards/ChangeFailureRateCard.tsx` (caption gate line 124, line render line 238)
- Modify: `src/content/DoraMetrics/DoraCards/MeanTimeToRestoreCard.tsx` (caption gate line 96, line render line 206)

Each card currently builds a module-level constant `chartOptions`. The band depends on props, so it must move into a `useMemo` merged with the constant via ramda's `mergeDeepRight` (already used in `InternalChart2.tsx`).

**The two empty-incident paths are the point of this task** — do not treat them as edge cases.

- [ ] **Step 1: Change Failure Rate — zero incidents is a real 0%, not missing data**

The caption is gated on `canShowIncidentsData && isCfrDataAvailable`. With no incidents the team has a **0% failure rate**, which beats any target, and today that renders as nothing at all. Gate the band and caption on the **target** being set rather than on incidents existing, and pass `actual = 0`:

```tsx
// CLUSTOX: zero incidents is a genuine 0% change failure rate -- the best
// possible result -- not absent data. Gating this on canShowIncidentsData
// meant a perfect score displayed as an empty card.
const cfrActual = isCfrDataAvailable ? changeFailureRateProps.count : 0;
```

- [ ] **Step 2: MTTR — zero incidents genuinely has no value**

There is no recovery time to measure, so no band and no comparison. Render only a grey target line beneath *"No incidents reported"*:

```tsx
{!canShowMTRData && meanTimeToRecoveryBenchmark?.target != null && (
  <Line tiny secondary>
    target {formatBenchmarkValue('mean_time_to_recovery', meanTimeToRecoveryBenchmark.target)}
    {' — '}{sourceLabel(meanTimeToRecoveryBenchmark.source)}
  </Line>
)}
```

- [ ] **Step 3: Lead Time and Deployment Frequency**

Merge `benchmarkBandOptions` into each card's options. Deployment frequency is the one metric where the band covers *upward* — confirm visually that its band is on the opposite side from the other three.

- [ ] **Step 4: Typecheck, run the frontend tests, commit**

```bash
git commit -am "feat(benchmarks): render the target band on all four DORA cards"
```

---

### Task 6: The LOC card and the 2×3 grid

**Files:**
- Create: `src/content/DoraMetrics/DoraCards/LinesOfCodeCard.tsx`
- Modify: `src/content/DoraMetrics/DoraMetricsBody.tsx:143-157` (the `<Grid container>`)

- [ ] **Step 1: Build the card**

Copy the structure of `ChangeTimeCard.tsx` — the same `FlexBox` shell, the same `Chart2` trend behind the number, the same caption slot. Headline is **weekly lines changed**, with `+additions / −deletions` beneath it and the benchmarked **average PR size** as the figure the band is drawn against.

- [ ] **Step 2: Add the sixth grid slot**

```tsx
<Grid item xs={12} md={6} order={5}>
  <LinesOfCodeCard />
</Grid>
```

Leave slot six empty — no placeholder tile. An empty cell reads as room for more; a "coming soon" tile reads as unfinished.

- [ ] **Step 3: Handle the old-backend case**

With `loc_stats` absent from the response the other four cards must still render. Verify by deleting the key from the response in the browser devtools, or by pointing the frontend at a backend without Task 1.

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(loc): add the lines of code card in a 2x3 grid"
```

---

### Task 7: Regression and end-to-end verification

**Files:**
- Modify: `web-server/e2e/benchmarks.spec.ts`
- Test: `backend/analytics_server/tests/service/code/test_loc.py` (filter coverage)

- [ ] **Step 1: LOC respects every existing filter**

Assert in the backend tests that `get_team_loc_metrics` narrows with a contributor `authors` filter and with `branch_mode = PROD`, and that unmerged PRs are excluded. LOC inherits these through `PRFilter`; a test proves it stayed inherited.

- [ ] **Step 2: Extend the isolation suite**

Add `lines_of_code` to the payloads in `e2e/benchmarks.spec.ts` and assert it round-trips. The suite honours `E2E_BASE_URL`, so it can run against a second server:

```
docker exec -e SUPERADMIN_PASSWORD='<value>' -e E2E_BASE_URL='http://localhost:3334' \
  middleware-dev sh -lc 'cd /app/web-server && npx playwright test e2e/benchmarks.spec.ts --reporter=list'
```

Playwright's browsers are **not** installed in the image — `APIRequestContext` tests run fine, page-level ones do not. Do not try to install them.

- [ ] **Step 3: The regression guarantee, restated**

With no benchmark rows at all: all five cards render with no band and no caption, and every existing `*_stats` value is unchanged. This is the single most important test in the plan — the feature is additive and the four cards people already rely on must not move.

- [ ] **Step 4: Full suites, then commit**

Backend `pytest`, frontend `tsc` and `jest`, and the isolation suite. Report the actual numbers.

```bash
git commit -am "test(loc): cover filter inheritance and the five-metric round trip"
```
