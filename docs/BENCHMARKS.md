# Per-team DORA benchmarks — design

**Status:** approved, not implemented
**Date:** 2026-08-11
**Estimate:** 3–4 days

Each team can set its own target for the four DORA metrics. A team without a
target inherits a baseline the superadmin sets. Each metric card shows its
target as a line on the trend it already draws, with a caption saying how far
off it is and which benchmark applied.

---

## Decisions

Settled before design. Changing one of these changes the design, not the
implementation.

| Decision | Choice | Consequence |
|---|---|---|
| Scope unit | **Team** | Teams are already what the dashboard filters by, so a benchmark per team matches what is on screen. `Settings` already stores per-team rows, so no new pattern. |
| Benchmark shape | **One target value per metric** | Four numbers, not twelve band thresholds. Simple to enter, simple to explain, and the graph becomes obvious: actual against a target line. |
| Relationship to the industry pills | **Additive** | Elite/High/Medium/Low stay exactly as they are, as an external reference. The benchmark is your own goal. A team can be "High" by industry standards and still missing its own target — usually the more useful conversation. |
| Graph | **Trend with a target line** | The Lead Time and Deployment Frequency cards already render a trend behind the number. Adding a line makes an existing decorative graphic informative. |
| Storage | **Reuse `Settings`** | No migration. `data` is JSONB, so the LOC target arrives later for free. |
| Resolution | **Backend** | The API returns the resolved target and its source. The browser draws a line; it never implements inheritance. |

## Scope

This spec covers benchmarks and the graphs. **Lines of code is a separate
feature** with its own spec — it is a new metric, not part of this one, and
depends on nothing here. Worth noting for whoever picks it up: the data is
already synced. All 429 pull requests in the current database have
`meta.code_stats` populated, and `PullRequest` already exposes `additions`,
`deletions` and `changed_files` as properties. LOC is aggregation and a card,
not an integration.

---

## Data model

Four numbers stored as JSONB under a new `SettingType.BENCHMARK_SETTING`:

```json
{
  "lead_time": 86400,
  "deployment_frequency": 5,
  "change_failure_rate": 15,
  "mean_time_to_recovery": 3600
}
```

Units match what the metrics API already returns — **seconds** for lead time
and MTTR, **deployments per week** for frequency, **percent** for CFR. No
conversion layer: the API compares like with like and the UI formats targets
exactly as it already formats actual values.

Every field is optional. A team can set a lead-time target and inherit the
rest — **fallback is per metric, not all-or-nothing**. Teams have opinions
about one or two metrics, rarely all four.

### Where rows live

| Scope | Row | Who sets it |
|---|---|---|
| Team | `(team_id, TEAM, BENCHMARK_SETTING)` | Workspace admin, own teams only |
| Global baseline | `(sentinel-uuid, GLOBAL, BENCHMARK_SETTING)` | Superadmin only |

`EntityType.GLOBAL` is new. `Settings.entity_type` is `character varying` and
the schema declares no native enum types, so this is a code change —
**no migration anywhere in this feature**.

`entity_id` is `NOT NULL`, so the global row uses a fixed sentinel UUID. That
is a documented wart, not a clever trick.

### Resolution

Per metric, in the backend:

```
team value set?  → use it,            source: "team"
otherwise        → global baseline,   source: "global"
neither          → no target,         source: null
```

The metrics response carries the result:

```json
"benchmarks": {
  "lead_time":            { "target": 86400, "source": "team" },
  "deployment_frequency": { "target": 5,     "source": "global" },
  "change_failure_rate":  { "target": null,  "source": null }
}
```

Three reasons this is server-side. Every consumer would otherwise reimplement
the fallback and eventually disagree. The API can report *which* benchmark
applied, so an admin who thinks they set one can see that they did not. And
when LOC arrives it is a fifth key here, not a fifth reimplementation.

---

## API surface

**Team benchmark** reuses the existing settings routes. No new Flask code:

```
GET  /teams/<team_id>/settings?setting_type=BENCHMARK_SETTING
PUT  /teams/<team_id>/settings
```

Workspace scoping comes free: `Endpoint.serve()` already asserts team access
on any payload carrying a `team_id`.

**Global baseline** is the one new route, because settings routes today are
team- and org-scoped and this is neither:

```
GET  /settings/global?setting_type=BENCHMARK_SETTING
PUT  /settings/global
```

Superadmin only, enforced with `assertRole(session, 'SUPERADMIN')` at the BFF.
The Flask layer has no notion of who is calling — it trusts the internal
token — so the check cannot live there.

**Resolved benchmarks ride on the existing metrics response** rather than
getting their own endpoint. The dashboard already makes one call for all four
metrics; a second call for targets would let the numbers and the lines drawn
against them disagree, and would add a round trip to a page that is already
the slowest in the product.

### Already exists — not being built

`SettingsService.get_settings`, `save_settings`, `get_settings_map`; `GET`/`PUT`
on `/teams/<team_id>/settings`; and `get_default_setting_data`, which is where
the shipped global baseline lives before anyone edits it.

---

## The graph

Each card gains a dashed target line on its existing trend, plus a caption:

> **6h 49m under target** · your team's benchmark

Three things in a few words: the gap, the direction, and which benchmark
applied. `your team's benchmark` versus `the default benchmark` is how an
admin discovers their setting did not save.

**Direction is per metric.** Lower is better for lead time, CFR and MTTR;
higher is better for deployment frequency. So "under target" is good on three
cards and bad on the fourth. The caption states the fact — `above target` /
`below target` — and colour carries the judgement: green on the good side,
amber on the other. **Never red.** A missed internal goal is not an error, and
colouring it like one makes the dashboard punitive.

**No benchmark at any level** means no line, no caption, and the card renders
exactly as it does today. That is the state every card is in before anyone
configures anything, so it must look deliberate rather than broken.

### Configuration screen

One form per scope: four labelled number inputs with units shown, each with a
placeholder showing the inherited value — an admin sees `24h (default)` greyed
into the lead-time field and understands what clearing it does.

Team benchmarks live in the existing team settings area. The global baseline
gets a section on the superadmin's Workspaces page, already the superadmin-only
surface.

Clearing a field removes that key and falls back. That is the only way to
*un*-set a target, so "empty means inherit" is stated in the UI, not just
implied by the code.

---

## Validation

Server-side on `PUT`. The browser is not a trust boundary and these numbers
feed a shared dashboard.

| Rule | Why |
|---|---|
| Positive numbers only | A negative or zero lead-time target is unachievable; a zero deployment target is meaningless |
| CFR is 0–100 | It is a percentage |
| Unknown keys rejected | A typo like `leadtime` would store silently and inherit forever |
| Absent is not zero | Omitting a key means inherit; `0` is deliberate and must be preserved |

The last rule is the trap. A form sending `0` for empty fields would turn
"inherit" into "target zero" on every save, and the dashboard would show every
team failing everything. The UI omits empty fields rather than sending zero,
and the API distinguishes the two.

## Edge cases

**A team spanning very different repos** gets one benchmark, because the
dashboard aggregates to team level. A real limitation, stated rather than
solved — per-repo targets would need a rule for combining them into the single
number on the card.

**A deleted team's benchmark** is orphaned in `Settings`. Harmless and
invisible; cleaning it up means touching team deletion for no user-facing gain.

**A superadmin viewing another workspace** sees that workspace's team
benchmarks. Resolution keys on the team being viewed, not on who is looking.

**A benchmark changed while the dashboard is open** does not appear until
reload — the same as every other filter on that page.

**Zero deployments against a frequency target** still shows the line and
`5/week below target`, which is more useful than hiding the line because the
actual value happens to be zero.

---

## Testing

Resolution is where the bugs will be, so that is where the tests concentrate:

- Team value set → used, `source: "team"`
- Team value absent → global used, `source: "global"`
- Neither set → `target: null`, card renders without a line
- **Per-metric mixing** — team sets only lead time; the other three inherit and
  report `source: "global"` in the same response
- **`0` is preserved, not treated as absent**

**Validation:** negatives rejected, CFR above 100 rejected, unknown keys
rejected, omitted keys left untouched rather than nulled.

**Isolation, request-level e2e:** an admin cannot read or write another
workspace's team benchmark → 403. A non-superadmin cannot `PUT` the global
baseline → 403.

**Regression, and the most important test here:** with no benchmarks
configured anywhere, every existing metric response is byte-identical to
today. This feature is additive, and the four cards people already rely on
must not shift because a `benchmarks` key appeared.

**Frontend:** direction handled per metric, so "under target" reads as good on
lead time and bad on deployment frequency; the caption names the source; no
line at all when `target` is null.

---

## Deliberately excluded

- **No per-workspace tier.** Two levels were specified; a third needs its own
  precedence rules for no stated benefit.
- **No custom band thresholds.** The industry pills stay as they are.
- **No history of benchmark changes.** Who changed a target and when is a
  reasonable thing to want, and not this feature.
- **No LOC.** Separate spec, separate PR.
