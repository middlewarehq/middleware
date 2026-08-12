# Per-team DORA Benchmarks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each team can set its own target for the four DORA metrics, inheriting a superadmin baseline when unset, with the target drawn on each metric card.

**Architecture:** Benchmarks are a new `SettingType` stored in the existing `Settings` table — team rows keyed `(team_id, TEAM)`, the global baseline keyed `(sentinel-uuid, GLOBAL)`. The backend resolves team-then-global **per metric** and returns the resolved target plus its source on the existing metrics response. The frontend draws a line and a caption; it never implements inheritance.

**Tech Stack:** Python 3.9, Flask, SQLAlchemy 2, pytest (backend); Next.js 15 pages router, TypeScript, MUI 5 (frontend).

**Design spec:** `docs/BENCHMARKS.md`. Read it before starting.

## Global Constraints

- **No database migration, no new tables.** `Settings.entity_type` is `character varying` and the schema declares no native enum types, so `EntityType.GLOBAL` is a code change. `Settings.data` is JSONB.
- **Units match the metrics API exactly** — seconds for `lead_time` and `mean_time_to_recovery`, deployments per week for `deployment_frequency`, percent for `change_failure_rate`. No conversion layer.
- **Absent is not zero.** Omitting a key means inherit; `0` is a deliberate value and must be preserved. A form sending `0` for empty fields would turn inherit into target-zero on every save and show every team failing everything.
- **Direction is per metric.** Lower is better for lead time, CFR and MTTR; higher is better for deployment frequency.
- **Additive only.** With no benchmarks configured anywhere, every existing metric response must be byte-identical to today and the four cards must not shift.
- Backend style: `black` formatted, `flake8` clean. Run from `backend/analytics_server` using `./venv/bin/python`. Baseline: **269 passing**.
- Frontend must be `tsc` clean. Local Node is 20 and the project needs 22 — verify inside the `middleware-dev` container.
- Every Clustox-authored change carries a `# CLUSTOX:` or `// CLUSTOX:` comment explaining **why**, per `docs/FORK_STRATEGY.md`.

## The eleven extension points — read before Task 1

Adding a `SettingType` to this codebase means touching eleven places. Upstream
marks each with a comment. **Missing one is a silent failure, not a crash** —
the setting saves but reads back wrong, or validates but never persists.

| # | File | Marker |
|---|---|---|
| 1 | `mhq/store/models/settings/configuration_settings.py:22` | `ADD NEW SETTING TYPE ENUM HERE` |
| 2 | `mhq/service/settings/models.py:60` | `ADD NEW SETTING CLASS HERE` |
| 3 | `mhq/service/settings/default_settings_data.py:38` | `ADD NEW DEFAULT SETTING HERE` |
| 4 | `mhq/service/settings/configuration_settings.py:76` | `ADD NEW DICT TO DATACLASS ADAPTERS HERE` |
| 5 | `mhq/service/settings/configuration_settings.py:101` | `ADD NEW HANDLE FROM DB SETTINGS HERE` |
| 6 | `mhq/service/settings/configuration_settings.py:201` | `ADD NEW DICT TO API ADAPTERS HERE` |
| 7 | `mhq/service/settings/configuration_settings.py:226` | `ADD NEW HANDLE FROM JSON DATA HERE` |
| 8 | `mhq/service/settings/configuration_settings.py:272` | `ADD NEW DATACLASS TO JSON DATA ADAPTERS HERE` |
| 9 | `mhq/service/settings/configuration_settings.py:308` | `ADD NEW HANDLE TO DB SETTINGS HERE` |
| 10 | `mhq/service/settings/setting_type_validator.py:25` | `ADD NEW VALIDATOR HERE` |
| 11 | `mhq/api/resources/settings_resource.py` | `ADD NEW API ADAPTER HERE` |

Line numbers drift — search for the marker text, not the number.

**Point 11 was missed when this plan was first written**, because the search
that found the others covered only `mhq/service/settings/` and
`mhq/store/models/settings/`. Without it, `adapt_configuration_settings_response`
never populates `response["setting"]` for a benchmark, so `GET` returns only
timestamps — invisible until something tries to read a saved value. Search the
whole of `mhq/` for the marker text, not a subtree:

```
grep -rn "ADD NEW" mhq/
```

---

## File Structure

**Backend — modify:**
- `mhq/store/models/settings/configuration_settings.py` — `SettingType.BENCHMARK_SETTING`
- `mhq/store/models/settings/enums.py` — `EntityType.GLOBAL`
- `mhq/service/settings/models.py` — `BenchmarkSetting` dataclass
- `mhq/service/settings/default_settings_data.py` — shipped baseline
- `mhq/service/settings/configuration_settings.py` — six adapter/dispatch points
- `mhq/service/settings/setting_type_validator.py` — accept the new type
- `mhq/api/settings.py` — global baseline routes
- `mhq/api/deployment_analytics.py` — attach resolved benchmarks (see Task 3 note)

**Backend — create:**
- `mhq/service/settings/benchmarks.py` — resolution and validation
- `tests/service/settings/test_benchmarks.py`
- `tests/service/settings/test_benchmark_setting_type.py`

**Frontend — create:**
- `web-server/pages/api/clustox/benchmarks/global.ts`
- `web-server/src/components/BenchmarkTargetLine.tsx`
- `web-server/src/components/BenchmarkSettingsForm.tsx`
- `web-server/src/utils/benchmarks.ts`

**Frontend — modify:**
- the four cards under `web-server/src/content/DoraMetrics/DoraCards/`
- `web-server/pages/workspaces.tsx` — global baseline section

---

### Task 1: Register BENCHMARK_SETTING across the extension points

**Files:**
- Modify: `backend/analytics_server/mhq/store/models/settings/configuration_settings.py`
- Modify: `backend/analytics_server/mhq/store/models/settings/enums.py`
- Modify: `backend/analytics_server/mhq/service/settings/models.py`
- Modify: `backend/analytics_server/mhq/service/settings/default_settings_data.py`
- Modify: `backend/analytics_server/mhq/service/settings/configuration_settings.py`
- Modify: `backend/analytics_server/mhq/service/settings/setting_type_validator.py`
- Test: `backend/analytics_server/tests/service/settings/test_benchmark_setting_type.py` (create)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `SettingType.BENCHMARK_SETTING` (value `"BENCHMARK_SETTING"`)
  - `EntityType.GLOBAL` (value `"GLOBAL"`)
  - `BenchmarkSetting(lead_time, deployment_frequency, change_failure_rate, mean_time_to_recovery)` — every field `Optional[float]`, defaulting to `None`
  - `settings_type_validator("BENCHMARK_SETTING")` returns the enum member

- [ ] **Step 1: Write the failing tests**

Create `backend/analytics_server/tests/service/settings/test_benchmark_setting_type.py`:

```python
from mhq.service.settings.default_settings_data import get_default_setting_data
from mhq.service.settings.models import BenchmarkSetting
from mhq.service.settings.setting_type_validator import settings_type_validator
from mhq.store.models.settings import SettingType
from mhq.store.models.settings.enums import EntityType


def test_benchmark_setting_type_exists():
    assert SettingType.BENCHMARK_SETTING.value == "BENCHMARK_SETTING"


def test_global_entity_type_exists():
    # The superadmin baseline belongs to no team and no workspace.
    assert EntityType.GLOBAL.value == "GLOBAL"


def test_validator_accepts_the_new_type():
    assert settings_type_validator("BENCHMARK_SETTING") == SettingType.BENCHMARK_SETTING


def test_default_baseline_has_all_four_metrics():
    data = get_default_setting_data(SettingType.BENCHMARK_SETTING)

    assert set(data.keys()) == {
        "lead_time",
        "deployment_frequency",
        "change_failure_rate",
        "mean_time_to_recovery",
    }


def test_benchmark_setting_fields_default_to_none():
    # Every field is optional: a team may set one target and inherit the rest.
    setting = BenchmarkSetting()

    assert setting.lead_time is None
    assert setting.deployment_frequency is None
    assert setting.change_failure_rate is None
    assert setting.mean_time_to_recovery is None
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend/analytics_server && ./venv/bin/python -m pytest tests/service/settings/test_benchmark_setting_type.py -v`
Expected: FAIL with `AttributeError: BENCHMARK_SETTING`

- [ ] **Step 3: Add the enums**

In `mhq/store/models/settings/configuration_settings.py`, at the `ADD NEW SETTING TYPE ENUM HERE` marker:

```python
    # CLUSTOX: per-team DORA targets. Stored here rather than in a new table
    # because Settings already has the entity scoping, service and API this
    # needs, and its JSONB data column means adding a fifth metric later costs
    # no migration.
    BENCHMARK_SETTING = "BENCHMARK_SETTING"
```

In `mhq/store/models/settings/enums.py`:

```python
class EntityType(Enum):
    USER = "USER"
    TEAM = "TEAM"
    ORG = "ORG"
    # CLUSTOX: the superadmin's baseline benchmark belongs to no team and no
    # workspace. entity_type is character varying with no native enum, so this
    # needs no migration.
    GLOBAL = "GLOBAL"
```

- [ ] **Step 4: Add the dataclass**

In `mhq/service/settings/models.py`, at the `ADD NEW SETTING CLASS HERE` marker:

```python
# CLUSTOX: every field is optional so fallback is per metric, not
# all-or-nothing -- a team may set a lead-time target and inherit the rest.
@dataclass
class BenchmarkSetting(BaseSetting):
    lead_time: Optional[float] = None
    deployment_frequency: Optional[float] = None
    change_failure_rate: Optional[float] = None
    mean_time_to_recovery: Optional[float] = None
```

Check that file's existing imports for `dataclass` and `Optional` before adding them.

- [ ] **Step 5: Add the shipped baseline**

In `mhq/service/settings/default_settings_data.py`, at the `ADD NEW DEFAULT SETTING HERE` marker:

```python
    # CLUSTOX: the baseline a workspace sees before a superadmin edits it.
    # Values are the DORA "High" band, in the same units the metrics API
    # returns: seconds, deployments per week, percent.
    if setting_type == SettingType.BENCHMARK_SETTING:
        return {
            "lead_time": 86400,
            "deployment_frequency": 5,
            "change_failure_rate": 15,
            "mean_time_to_recovery": 3600,
        }
```

- [ ] **Step 6: Add the six adapters and dispatch branches**

In `mhq/service/settings/configuration_settings.py`, add an adapter at the `ADD NEW DICT TO DATACLASS ADAPTERS HERE` marker:

```python
    # CLUSTOX: `data.get(key)` rather than `data.get(key, 0)` -- absent means
    # inherit, and 0 is a deliberate target. Collapsing them would make every
    # unset metric read as a target of zero.
    def _adapt_benchmark_setting_from_setting_data(self, data: Dict[str, any]):
        return BenchmarkSetting(
            lead_time=data.get("lead_time"),
            deployment_frequency=data.get("deployment_frequency"),
            change_failure_rate=data.get("change_failure_rate"),
            mean_time_to_recovery=data.get("mean_time_to_recovery"),
        )
```

At `ADD NEW HANDLE FROM DB SETTINGS HERE`:

```python
        if setting_type == SettingType.BENCHMARK_SETTING:
            return self._adapt_benchmark_setting_from_setting_data(setting_data)
```

At `ADD NEW DICT TO API ADAPTERS HERE`, and at `ADD NEW DATACLASS TO JSON DATA ADAPTERS HERE`, add adapters mirroring the two `default_sync_days` adapters immediately above each marker — read those first and follow their shape exactly, substituting the four benchmark keys. At `ADD NEW HANDLE FROM JSON DATA HERE` and `ADD NEW HANDLE TO DB SETTINGS HERE`, add the matching `if setting_type == SettingType.BENCHMARK_SETTING:` branches.

All four keys must round-trip through every adapter. A key missing from one of them saves and then reads back as `None`.

- [ ] **Step 7: Add the validator branch**

In `mhq/service/settings/setting_type_validator.py`, at the `ADD NEW VALIDATOR HERE` marker:

```python
    if setting_type == SettingType.BENCHMARK_SETTING.value:
        return SettingType.BENCHMARK_SETTING
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd backend/analytics_server && ./venv/bin/python -m pytest tests/service/settings/test_benchmark_setting_type.py -v`
Expected: PASS (5 tests)

- [ ] **Step 9: Run the full suite, format, lint, commit**

```bash
cd backend/analytics_server
./venv/bin/python -m pytest tests -q          # expect 274 passed
./venv/bin/python -m black mhq/store/models/settings/ mhq/service/settings/ tests/service/settings/
./venv/bin/python -m flake8 mhq/store/models/settings/ mhq/service/settings/
cd ../..
git add backend/analytics_server/mhq backend/analytics_server/tests
git commit -m "feat(benchmarks): register the benchmark setting type"
```

---

### Task 2: Resolution and validation

**Files:**
- Create: `backend/analytics_server/mhq/service/settings/benchmarks.py`
- Test: `backend/analytics_server/tests/service/settings/test_benchmarks.py` (create)

**Interfaces:**
- Consumes: `BenchmarkSetting`, `SettingType.BENCHMARK_SETTING`, `EntityType.GLOBAL` (Task 1).
- Produces:
  - `GLOBAL_BENCHMARK_ENTITY_ID: str` — the sentinel UUID for the global row
  - `BENCHMARK_METRICS: List[str]` — the four metric keys
  - `resolve_benchmarks(team_setting: Optional[BenchmarkSetting], global_setting: Optional[BenchmarkSetting]) -> Dict[str, Dict]` returning `{metric: {"target": float|None, "source": "team"|"global"|None}}`
  - `validate_benchmark_payload(data: Dict) -> Dict` — returns the cleaned dict, raises `BadRequest` on invalid input

- [ ] **Step 1: Write the failing tests**

Create `backend/analytics_server/tests/service/settings/test_benchmarks.py`:

```python
import pytest
from werkzeug.exceptions import BadRequest

from mhq.service.settings.benchmarks import (
    BENCHMARK_METRICS,
    resolve_benchmarks,
    validate_benchmark_payload,
)
from mhq.service.settings.models import BenchmarkSetting


def test_team_value_wins_and_reports_its_source():
    team = BenchmarkSetting(lead_time=3600)
    glob = BenchmarkSetting(lead_time=86400)

    resolved = resolve_benchmarks(team, glob)

    assert resolved["lead_time"] == {"target": 3600, "source": "team"}


def test_absent_team_value_falls_back_to_global():
    team = BenchmarkSetting(lead_time=3600)
    glob = BenchmarkSetting(lead_time=86400, deployment_frequency=5)

    resolved = resolve_benchmarks(team, glob)

    assert resolved["deployment_frequency"] == {"target": 5, "source": "global"}


def test_neither_set_yields_no_target():
    resolved = resolve_benchmarks(BenchmarkSetting(), BenchmarkSetting())

    assert resolved["change_failure_rate"] == {"target": None, "source": None}


def test_metrics_mix_sources_within_one_response():
    # The case that makes per-metric fallback worth having.
    team = BenchmarkSetting(lead_time=3600)
    glob = BenchmarkSetting(lead_time=86400, deployment_frequency=5)

    resolved = resolve_benchmarks(team, glob)

    assert resolved["lead_time"]["source"] == "team"
    assert resolved["deployment_frequency"]["source"] == "global"
    assert resolved["mean_time_to_recovery"]["source"] is None


def test_zero_is_a_real_target_not_an_absent_one():
    # A team targeting zero failures must not silently inherit 15%.
    team = BenchmarkSetting(change_failure_rate=0)
    glob = BenchmarkSetting(change_failure_rate=15)

    resolved = resolve_benchmarks(team, glob)

    assert resolved["change_failure_rate"] == {"target": 0, "source": "team"}


def test_missing_settings_are_treated_as_empty():
    resolved = resolve_benchmarks(None, None)

    assert set(resolved.keys()) == set(BENCHMARK_METRICS)
    assert all(v["target"] is None for v in resolved.values())


def test_validation_rejects_negatives():
    with pytest.raises(BadRequest):
        validate_benchmark_payload({"lead_time": -1})


def test_validation_rejects_change_failure_rate_above_100():
    with pytest.raises(BadRequest):
        validate_benchmark_payload({"change_failure_rate": 101})


def test_validation_rejects_unknown_keys():
    # A typo would otherwise store silently and inherit forever.
    with pytest.raises(BadRequest):
        validate_benchmark_payload({"leadtime": 3600})


def test_validation_keeps_zero_and_omits_nothing_else():
    cleaned = validate_benchmark_payload({"change_failure_rate": 0})

    assert cleaned == {"change_failure_rate": 0}


def test_validation_accepts_a_partial_payload():
    cleaned = validate_benchmark_payload({"lead_time": 3600})

    assert cleaned == {"lead_time": 3600}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend/analytics_server && ./venv/bin/python -m pytest tests/service/settings/test_benchmarks.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'mhq.service.settings.benchmarks'`

- [ ] **Step 3: Write the module**

Create `backend/analytics_server/mhq/service/settings/benchmarks.py`:

```python
# CLUSTOX: benchmark resolution and validation.
#
# Resolution lives in the backend rather than the browser for three reasons:
# every consumer would otherwise reimplement the fallback and eventually
# disagree; the response can report WHICH benchmark applied, so an admin who
# thinks they set a target can see that they did not; and a fifth metric later
# is one more key here rather than one more reimplementation.
from typing import Dict, List, Optional

from werkzeug.exceptions import BadRequest

from mhq.service.settings.models import BenchmarkSetting

# The global baseline belongs to no team and no workspace, but Settings.
# entity_id is NOT NULL. A fixed sentinel is the documented cost of reusing
# that table instead of adding one.
GLOBAL_BENCHMARK_ENTITY_ID = "00000000-0000-4000-8000-000000000001"

BENCHMARK_METRICS: List[str] = [
    "lead_time",
    "deployment_frequency",
    "change_failure_rate",
    "mean_time_to_recovery",
]

# Percent, so it has an upper bound the others do not.
_BOUNDED_METRICS = {"change_failure_rate": 100}


def resolve_benchmarks(
    team_setting: Optional[BenchmarkSetting],
    global_setting: Optional[BenchmarkSetting],
) -> Dict[str, Dict]:
    resolved = {}

    for metric in BENCHMARK_METRICS:
        team_value = getattr(team_setting, metric, None) if team_setting else None
        global_value = getattr(global_setting, metric, None) if global_setting else None

        # `is not None` rather than truthiness: 0 is a deliberate target.
        if team_value is not None:
            resolved[metric] = {"target": team_value, "source": "team"}
        elif global_value is not None:
            resolved[metric] = {"target": global_value, "source": "global"}
        else:
            resolved[metric] = {"target": None, "source": None}

    return resolved


def validate_benchmark_payload(data: Dict) -> Dict:
    unknown = set(data.keys()) - set(BENCHMARK_METRICS)
    if unknown:
        raise BadRequest(f"Unknown benchmark metrics: {', '.join(sorted(unknown))}")

    cleaned = {}
    for metric, value in data.items():
        if value is None:
            continue

        if not isinstance(value, (int, float)) or isinstance(value, bool):
            raise BadRequest(f"{metric} must be a number")

        if value < 0:
            raise BadRequest(f"{metric} must not be negative")

        upper = _BOUNDED_METRICS.get(metric)
        if upper is not None and value > upper:
            raise BadRequest(f"{metric} must be between 0 and {upper}")

        cleaned[metric] = value

    return cleaned
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend/analytics_server && ./venv/bin/python -m pytest tests/service/settings/test_benchmarks.py -v`
Expected: PASS (11 tests)

- [ ] **Step 5: Run the full suite, format, lint, commit**

```bash
cd backend/analytics_server
./venv/bin/python -m pytest tests -q          # expect 285 passed
./venv/bin/python -m black mhq/service/settings/benchmarks.py tests/service/settings/test_benchmarks.py
./venv/bin/python -m flake8 mhq/service/settings/benchmarks.py
cd ../..
git add backend/analytics_server/mhq/service/settings/benchmarks.py \
        backend/analytics_server/tests/service/settings/test_benchmarks.py
git commit -m "feat(benchmarks): resolve team targets against the global baseline"
```

---

### Task 3: Attach resolved benchmarks to the metrics response

**Files:**
- Modify: `backend/analytics_server/mhq/api/deployment_analytics.py`
- Test: extend `backend/analytics_server/tests/service/settings/test_benchmarks.py`

**Interfaces:**
- Consumes: `resolve_benchmarks`, `GLOBAL_BENCHMARK_ENTITY_ID` (Task 2); `SettingsService.get_settings` (existing).
- Produces: `get_resolved_benchmarks_for_team(team_id: str) -> Dict[str, Dict]`, and a `"benchmarks"` key on the team DORA metrics response.

- [ ] **Step 1: Write the failing test**

Append to `backend/analytics_server/tests/service/settings/test_benchmarks.py`:

```python
def test_resolution_asks_for_the_team_row_and_the_global_row():
    from mhq.service.settings.benchmarks import GLOBAL_BENCHMARK_ENTITY_ID
    from mhq.store.models.settings import SettingType
    from mhq.store.models.settings.enums import EntityType

    asked = []

    class FakeSettingsService:
        def get_settings(self, setting_type, entity_type, entity_id):
            asked.append((setting_type, entity_type, entity_id))
            return None

    from mhq.api.deployment_analytics import get_resolved_benchmarks_for_team

    get_resolved_benchmarks_for_team("team-1", settings_service=FakeSettingsService())

    assert (
        SettingType.BENCHMARK_SETTING,
        EntityType.TEAM,
        "team-1",
    ) in asked
    assert (
        SettingType.BENCHMARK_SETTING,
        EntityType.GLOBAL,
        GLOBAL_BENCHMARK_ENTITY_ID,
    ) in asked
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/analytics_server && ./venv/bin/python -m pytest tests/service/settings/test_benchmarks.py::test_resolution_asks_for_the_team_row_and_the_global_row -v`
Expected: FAIL with `ImportError: cannot import name 'get_resolved_benchmarks_for_team'`

- [ ] **Step 3: Add the helper**

Add to `backend/analytics_server/mhq/api/deployment_analytics.py`:

```python
# CLUSTOX: resolve a team's benchmarks for the metrics response. Injectable
# settings_service so the resolution order can be tested without a database.
def get_resolved_benchmarks_for_team(team_id: str, settings_service=None):
    from mhq.service.settings.benchmarks import (
        GLOBAL_BENCHMARK_ENTITY_ID,
        resolve_benchmarks,
    )
    from mhq.service.settings.configuration_settings import get_settings_service
    from mhq.store.models.settings import SettingType
    from mhq.store.models.settings.enums import EntityType

    settings_service = settings_service or get_settings_service()

    team_setting = settings_service.get_settings(
        SettingType.BENCHMARK_SETTING, EntityType.TEAM, team_id
    )
    global_setting = settings_service.get_settings(
        SettingType.BENCHMARK_SETTING, EntityType.GLOBAL, GLOBAL_BENCHMARK_ENTITY_ID
    )

    return resolve_benchmarks(
        getattr(team_setting, "specific_settings", None),
        getattr(global_setting, "specific_settings", None),
    )
```

- [ ] **Step 4: Attach it to the response**

Find the route in `mhq/api/deployment_analytics.py` that serves the team's DORA metrics (`/teams/<team_id>/deployment_analytics`). Add `"benchmarks": get_resolved_benchmarks_for_team(team_id)` to the dict it returns.

Read the existing return statement before editing. Do not reorder or rename any existing key — the regression guard in Step 5 exists because the four cards already rely on this response.

- [ ] **Step 5: Run the full suite**

Run: `cd backend/analytics_server && ./venv/bin/python -m pytest tests -q`
Expected: 286 passed, with no pre-existing test failing. If an existing test breaks, you changed the response shape rather than adding to it.

- [ ] **Step 6: Format, lint, commit**

```bash
cd backend/analytics_server
./venv/bin/python -m black mhq/api/deployment_analytics.py tests/service/settings/test_benchmarks.py
./venv/bin/python -m flake8 mhq/api/deployment_analytics.py
cd ../..
git add backend/analytics_server/mhq/api/deployment_analytics.py \
        backend/analytics_server/tests/service/settings/test_benchmarks.py
git commit -m "feat(benchmarks): return resolved targets with team metrics"
```

---

### Task 4: Global baseline routes

**Files:**
- Modify: `backend/analytics_server/mhq/api/settings.py`
- Create: `web-server/pages/api/clustox/benchmarks/global.ts`

**Interfaces:**
- Consumes: `GLOBAL_BENCHMARK_ENTITY_ID`, `validate_benchmark_payload` (Task 2).
- Produces:
  - Flask: `GET /settings/global?setting_type=BENCHMARK_SETTING`, `PUT /settings/global`
  - BFF: `GET`/`PUT` on `/api/clustox/benchmarks/global`, superadmin only

- [ ] **Step 1: Add the Flask routes**

In `backend/analytics_server/mhq/api/settings.py`, read `get_team_settings` and `put_team_settings` first and mirror their decorator stack, schema style and response adapter exactly. Add:

```python
# CLUSTOX: the superadmin's baseline belongs to no team and no workspace, so
# it cannot use the team- or org-scoped routes above. Authorisation is enforced
# at the BFF -- this layer only knows the internal token, not who is calling.
@app.route("/settings/global", methods={"GET"})
```

and the matching `PUT`, both operating on `entity_type=EntityType.GLOBAL` and `entity_id=GLOBAL_BENCHMARK_ENTITY_ID`. The `PUT` must pass its payload through `validate_benchmark_payload` before saving.

- [ ] **Step 2: Add the BFF route**

Create `web-server/pages/api/clustox/benchmarks/global.ts`:

```ts
import * as yup from 'yup';

import { Endpoint, nullSchema } from '@/api-helpers/global';
import { internal } from '@/api-helpers/axios';
import { assertRole } from '@/auth/guard';

// CLUSTOX: the global baseline is superadmin-only. The Flask layer trusts the
// internal token and has no notion of who is calling, so the role check has to
// live here.
const putSchema = yup.object().shape({
  lead_time: yup.number().min(0).nullable().optional(),
  deployment_frequency: yup.number().min(0).nullable().optional(),
  change_failure_rate: yup.number().min(0).max(100).nullable().optional(),
  mean_time_to_recovery: yup.number().min(0).nullable().optional()
});

const endpoint = new Endpoint(nullSchema);

endpoint.handle.GET(nullSchema, async (req, res) => {
  assertRole((req as any).session, 'SUPERADMIN');

  const result = await internal.get('/settings/global', {
    params: { setting_type: 'BENCHMARK_SETTING' }
  });
  res.send(result.data);
});

endpoint.handle.PUT(putSchema, async (req, res) => {
  assertRole((req as any).session, 'SUPERADMIN');

  const result = await internal.put('/settings/global', {
    setting_type: 'BENCHMARK_SETTING',
    setting_data: req.payload
  });
  res.send(result.data);
});

export default endpoint.serve();
```

Note the constructor receives `nullSchema`, not `putSchema`. `Endpoint.serve()` validates the constructor's schema against every method before dispatch, so a method-specific schema there makes `GET` a permanent 400. That exact bug has been found in this codebase twice.

- [ ] **Step 3: Verify**

```bash
cd backend/analytics_server && ./venv/bin/python -m pytest tests -q
docker cp web-server/pages/api/clustox/benchmarks/global.ts middleware-dev:/app/web-server/pages/api/clustox/benchmarks/global.ts
docker exec middleware-dev sh -c 'cd /app/web-server && ./node_modules/.bin/tsc --noEmit 2>&1 | grep -c "error TS"'
```
Expected: suite unchanged at 286; tsc reports `0`.

- [ ] **Step 4: Commit**

```bash
git add backend/analytics_server/mhq/api/settings.py \
        web-server/pages/api/clustox/benchmarks/global.ts
git commit -m "feat(benchmarks): expose the superadmin baseline"
```

---

### Task 5: Target line and caption on the metric cards

**Files:**
- Create: `web-server/src/utils/benchmarks.ts`
- Create: `web-server/src/components/BenchmarkTargetLine.tsx`
- Modify: the four cards in `web-server/src/content/DoraMetrics/DoraCards/`

**Interfaces:**
- Consumes: the `benchmarks` key on the metrics response (Task 3).
- Produces:
  - `benchmarkCaption(metric, actual, target, source) -> { text: string; tone: 'good' | 'warn' }`
  - `<BenchmarkTargetLine target={number} />`

- [ ] **Step 1: Write the failing test**

Create `web-server/src/utils/__tests__/benchmarks.test.ts`:

```ts
import { benchmarkCaption } from '../benchmarks';

describe('benchmarkCaption', () => {
  it('treats being under target as good for lead time', () => {
    const r = benchmarkCaption('lead_time', 3600, 7200, 'team');
    expect(r.tone).toBe('good');
    expect(r.text).toContain('under target');
  });

  it('treats being under target as bad for deployment frequency', () => {
    // Higher is better here -- the same direction means the opposite thing.
    const r = benchmarkCaption('deployment_frequency', 2, 5, 'team');
    expect(r.tone).toBe('warn');
    expect(r.text).toContain('below target');
  });

  it('names the source so a team can see its setting did not save', () => {
    expect(benchmarkCaption('lead_time', 3600, 7200, 'global').text).toContain(
      'default'
    );
    expect(benchmarkCaption('lead_time', 3600, 7200, 'team').text).toContain(
      'team'
    );
  });

  it('returns null when there is no target', () => {
    expect(benchmarkCaption('lead_time', 3600, null, null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `docker exec middleware-dev sh -c 'cd /app/web-server && yarn test --testPathPattern=benchmarks'`
Expected: FAIL — module not found

- [ ] **Step 3: Write the helper**

Create `web-server/src/utils/benchmarks.ts` exporting `benchmarkCaption`. Encode direction per metric — `lead_time`, `change_failure_rate` and `mean_time_to_recovery` are better when lower; `deployment_frequency` is better when higher. Return `tone: 'good'` on the favourable side and `'warn'` on the other. **Never red**: a missed internal goal is not an error, and colouring it like one makes the dashboard punitive. Return `null` when `target` is null so cards render exactly as they do today.

- [ ] **Step 4: Add the line and caption to the cards**

Create `BenchmarkTargetLine.tsx` — a dashed horizontal rule positioned on the card's existing trend chart — and render it plus the caption in each of `ChangeTimeCard`, `WeeklyDeliveryVolumeCard`, `ChangeFailureRateCard` and `MeanTimeToRestoreCard`. Read one card fully before editing; follow its existing layout rather than introducing a new one.

When `benchmarks[metric].target` is null, render neither. That is the state every card is in before anyone configures anything, so it must look deliberate.

- [ ] **Step 5: Verify and commit**

```bash
docker exec middleware-dev sh -c 'cd /app/web-server && yarn test --testPathPattern=benchmarks'
docker exec middleware-dev sh -c 'cd /app/web-server && ./node_modules/.bin/tsc --noEmit 2>&1 | grep -c "error TS"'
git add web-server/src/utils/benchmarks.ts web-server/src/utils/__tests__/benchmarks.test.ts \
        web-server/src/components/BenchmarkTargetLine.tsx \
        web-server/src/content/DoraMetrics/DoraCards/
git commit -m "feat(benchmarks): draw the target on each metric card"
```

---

### Task 6: Configuration forms

**Files:**
- Create: `web-server/src/components/BenchmarkSettingsForm.tsx`
- Modify: `web-server/pages/workspaces.tsx`

**Interfaces:**
- Consumes: `/api/clustox/benchmarks/global` (Task 4) and the existing team settings routes.
- Produces: nothing consumed by later tasks.

> **Resolution note.** Tasks 1–4 give exact code. This task specifies behaviour
> and contracts rather than full MUI bodies, because the markup is long and
> mechanical and is better written against the live components. Treat the
> acceptance criteria as the requirement.

- [ ] **Step 1: Build the form**

`BenchmarkSettingsForm.tsx` — four labelled number inputs with units shown (`hours`, `per week`, `%`, `hours`), taking a `scope` prop of `'team'` or `'global'` and posting to the corresponding endpoint.

Required behaviours:

- **An empty input means inherit, and must be omitted from the payload — never sent as `0`.** Sending `0` would turn inherit into target-zero on every save and show every team failing everything.
- Each input's placeholder shows the inherited value, e.g. `24h (default)`, so an admin can see what clearing it does.
- Hours are entered as hours and converted to seconds on submit; the API stores seconds.
- Validation errors from the server are shown inline against the field named in the message, not as a toast.

- [ ] **Step 2: Mount both scopes**

Team benchmarks go in the existing team settings area. The global baseline gets a section on `pages/workspaces.tsx`, already the superadmin-only surface, rendered only when `isSuperadmin`.

- [ ] **Step 3: Verify**

```bash
docker exec middleware-dev sh -c 'cd /app/web-server && ./node_modules/.bin/tsc --noEmit 2>&1 | grep -c "error TS"'
docker exec middleware-dev sh -c 'cd /app/web-server && yarn lint'
```

Then by hand: set a team lead-time target, confirm the card shows a line and `your team's benchmark`; clear it, confirm it reverts to `the default benchmark`; set a target of `0` for change failure rate and confirm it persists as 0 rather than inheriting.

- [ ] **Step 4: Commit**

```bash
git add web-server/src/components/BenchmarkSettingsForm.tsx web-server/pages/workspaces.tsx
git commit -m "feat(benchmarks): add the benchmark configuration forms"
```

---

### Task 7: Cross-workspace isolation tests

**Files:**
- Create: `web-server/e2e/benchmarks.spec.ts`

**Interfaces:**
- Consumes: the endpoints from Tasks 4 and 6.
- Produces: nothing.

- [ ] **Step 1: Write the isolation tests**

Create `web-server/e2e/benchmarks.spec.ts` following the structure of the existing `web-server/e2e/multitenancy.spec.ts` — read it first and match its sign-in helper, admin provisioning and `afterAll` cleanup exactly. Cover:

- An admin cannot read another workspace's team benchmark → **403**
- An admin cannot write another workspace's team benchmark → **403**
- A non-superadmin `PUT` to `/api/clustox/benchmarks/global` → **403**
- An unauthenticated request to either → **401**
- A superadmin can read and write the global baseline → **200**

Use RFC-4122 valid UUIDs for any placeholder ids. `yup.string().uuid()` enforces the version and variant nibbles, so `00000000-0000-0000-0000-000000000001` is rejected at schema validation and the test would assert 400-as-403 — a bug already found once in this codebase.

Use `00000000-0000-4000-8000-0000000000ff` for placeholders. Do **not** reuse `00000000-0000-4000-8000-000000000001`: that is `GLOBAL_BENCHMARK_ENTITY_ID`, the real global baseline row, and a test using it as a "nonexistent team" would be reasoning about live data.

- [ ] **Step 2: Run and commit**

```bash
cd web-server && SUPERADMIN_PASSWORD='<from .env>' yarn playwright test e2e/benchmarks.spec.ts
git add web-server/e2e/benchmarks.spec.ts
git commit -m "test(benchmarks): cross-workspace isolation"
```

---

## Final verification

- [ ] `cd backend/analytics_server && ./venv/bin/python -m pytest tests -q` — expect 286 passed
- [ ] `./venv/bin/python -m black --check mhq && ./venv/bin/python -m flake8 mhq` on changed files — clean
- [ ] `docker exec middleware-dev sh -c 'cd /app/web-server && ./node_modules/.bin/tsc --noEmit'` — 0 errors
- [ ] `cd web-server && yarn playwright test e2e/` — all suites pass
- [ ] **With no benchmarks configured anywhere, the four cards render exactly as they do today.** This is the highest-value check in the plan: the feature is additive, and the dashboards people already rely on must not shift because a `benchmarks` key appeared.
- [ ] Manual: set a team target, confirm the line and `your team's benchmark`; clear it, confirm `the default benchmark`; set `0` and confirm it persists.
