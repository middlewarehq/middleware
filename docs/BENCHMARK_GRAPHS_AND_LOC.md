# Benchmark graphs and the LOC metric — design

**Status:** approved, not implemented
**Date:** 2026-08-12
**Estimate:** 2–3 days
**Follows:** `docs/BENCHMARKS.md` (merged as `feat/benchmarks`)

Two changes to the same four cards, done in one pass so the layout is only
reworked once:

1. Replace the dashed target rule with a **shaded target band** on each card's
   trend — the region on the good side of the target is tinted, so the whole
   graph is coloured by whether the target is being met.
2. Add **lines of code** as a fifth metric, turning the 2×2 card grid into 2×3.

---

## Why the current visual is being replaced

The shipped version draws a 1px dashed `<div>` positioned by percentage over
the card's trend. Two problems, both visible on a real dashboard:

- **It pins to an edge.** The line's height is `target / max(target, ...values)`.
  A deployment-frequency target of 1/week against a series topping 35 sits at
  3% — indistinguishable from the card's bottom border. A lead-time target
  larger than every plotted value pins to the top. Correct arithmetic,
  unreadable result.
- **Two of four cards render nothing.** Change Failure Rate and MTTR gate both
  the caption and the line on `canShowIncidentsData` / `canShowMTRData`. With
  no incidents — the common case on a healthy team — half the dashboard shows
  no benchmark at all, despite a target being set.

## Decisions

| Decision | Choice | Consequence |
|---|---|---|
| Visual | **Shaded target band on the existing trend** | The graph itself carries the verdict; no extra vertical space on a dense page. |
| Drawn by | **`chartjs-plugin-annotation`** | Already a dependency and already registered in `InternalChart2.tsx`, unused. Annotations are positioned in *data* space, so the band tracks the y-scale instead of being hand-positioned in percent. Deletes `BenchmarkTargetLine.tsx` and its clamping arithmetic. |
| LOC placement | **2×3 grid** | LOC is a peer metric, not an addendum. Costs a reflow of all four existing cards and leaves one empty slot. |
| LOC source | **Merged PRs only** | Matches the contributor dropdown, which already counts merged PRs only. An abandoned 5,000-line PR is not delivered work. |
| LOC benchmark | **Average lines changed per merged PR** | See below — this is the one genuinely contentious choice. |

### The LOC benchmark targets PR size, not weekly volume

The obvious reading of "a LOC benchmark" is a target for lines changed per
week. It is the wrong thing to benchmark, because **it has no good direction.**
Higher weekly LOC might mean a productive week or a bloated one; lower might
mean focus or a stall. A caption saying `above target` would be neither praise
nor warning, and the band would tint a region that carries no meaning.

Average lines per merged PR does have a direction: **lower is better.** Small
PRs review faster and merge sooner, which is why it is worth putting next to
lead time — the two move together, and a team missing its lead-time target can
look one card across and see PR size as a likely cause.

So the card shows **both**: weekly volume as the headline (that is what people
mean by "lines of code"), and average PR size as the benchmarked figure with
the band drawn against it.

If this is wrong for your team, it is one line — `LOWER_IS_BETTER` and which
series the band keys off. Nothing else changes.

---

## The band

Each card's trend gains two annotations:

- a **line** at the target, solid, low contrast
- a **box** from the target to the good-side edge of the scale, tinted

Colour follows the shipped rule: `success` when the current value is on the
good side, `warning` when not. **Never red** — a missed internal goal is not an
error.

Direction per metric, unchanged from `docs/BENCHMARKS.md`:

| Metric | Lower is better | Band covers |
|---|---|---|
| Lead time | yes | target → 0 |
| Change failure rate | yes | target → 0 |
| MTTR | yes | target → 0 |
| Deployment frequency | no | target → top |
| **Average PR size** | **yes** | target → 0 |

**The y-scale must include the target.** Chart2's grids `beginAtZero` with
`grace: '10%'` on the max. If the target exceeds the plotted max the band would
be clipped off-canvas, so the scale's `suggestedMax` becomes
`max(dataMax, target)`. This is the fix for the pinning problem: the target is
always on-canvas, in proportion.

### The two empty-incident cards

This is the known cost of choosing a band over a bar, and it is handled per
metric rather than left blank:

**Change Failure Rate with no incidents** is not missing data — it is a
**genuine 0%**, which beats any target. The card currently suppresses the
caption entirely. It will instead render the band and
`0% is under target (15%) — the default benchmark`. This is a strict
improvement: the best possible result stops being displayed as nothing.

**MTTR with no incidents** has genuinely no value — there is no recovery time
to measure. No band, no comparison. The card keeps *"No incidents reported"*
and adds one grey line: `target 1h — the default benchmark`, so an admin can
still see the target exists without being shown a comparison against nothing.

The distinction matters: conflating "zero failures" with "no data" would
either hide a perfect score or invent a fake one.

---

## LOC data

**Nothing needs syncing.** Verified in the live database: 431 of 431 pull
requests have `meta.code_stats` populated, and `PullRequest` already exposes
`additions`, `deletions` and `changed_files` as properties. This is
aggregation and a card.

```json
{"commits": 1, "comments": 1, "additions": 23, "deletions": 2, "changed_files": 4}
```

### Backend

New service `mhq/service/code/loc.py`, and two routes on
`mhq/api/pull_requests.py` mirroring the lead-time pair exactly:

```
GET /teams/<team_id>/loc          -> current + previous aggregate
GET /teams/<team_id>/loc/trends   -> weekly series
```

Both take the existing `PRFilter`, so **the contributor filter, branch mode and
the excluded-PRs setting all apply with no extra work** — LOC per person comes
along for free.

Response shape, matching the other stats blocks:

```json
"loc_stats": {
  "current":  {"additions": 12043, "deletions": 4110, "avg_pr_size": 214},
  "previous": {"additions": 9800,  "deletions": 3050, "avg_pr_size": 187}
}
```

`avg_pr_size` is `(additions + deletions) / merged PR count`, `0` when there
are no merged PRs — never a division by zero, and never `null`, so the card
does not need a third empty state.

### Frontend

`fetchLocStats` in `cockpitMetricUtils.ts`, added to the `Promise.all` in the
`dora_metrics` BFF route and sent in the same response — the same path the
benchmarks now take, and for the same reason: one call, one consistent set of
numbers.

**It must be `.catch(() => undefined)`** like `fetchTeamBenchmarks`. A new
route failing inside that `Promise.all` would blank all five cards.

---

## Benchmarks for LOC

`lines_of_code` becomes a fifth key. The storage decision in
`docs/BENCHMARKS.md` was made for exactly this:

- `BENCHMARK_METRICS` gains one entry — **no migration**, `data` is JSONB
- `validate_benchmark_payload` picks it up from that list automatically
- both forms gain one field, in **lines** (no unit conversion)
- `LOWER_IS_BETTER` gains it

Unit is average lines per PR, matching what the band is drawn against.

---

## Layout

The four cards move from a 2×2 to a 2×3 grid, LOC in slot five, slot six
empty. The empty slot is deliberate and will not be filled with a placeholder
— an empty cell reads as "room for more", a "coming soon" tile reads as
unfinished.

At `md` and below the grid is already single-column, so LOC simply appends and
nothing reflows.

---

## Testing

**The band, per metric:** target above the plotted max is on-canvas and not
clipped; target below the min likewise; colour flips with the direction table
above; deployment frequency's band covers the opposite side from the other
four.

**The two empty-incident paths:** CFR with zero incidents renders a band and a
`0% is under target` caption; MTTR with zero incidents renders neither, plus
the grey target line.

**LOC aggregation:** unmerged PRs excluded; `avg_pr_size` is 0 rather than a
crash when no PRs merged; the contributor filter narrows it; branch mode
narrows it.

**Regression, and the most important test again:** with no benchmarks
configured anywhere, all five cards render exactly as they do today — no band,
no caption. And with LOC absent from the response entirely (an old backend
behind a new frontend), the other four cards must still render.

---

## Deliberately excluded

- **No per-repo LOC breakdown.** The dashboard aggregates to team level.
- **No language or file-type split.** `code_stats` does not carry it.
- **No LOC in the DORA score.** The score is the four DORA metrics; adding a
  fifth input would change every historical number on every dashboard.
