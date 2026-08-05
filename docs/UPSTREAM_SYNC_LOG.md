# Upstream Sync Log

A row per merge from `middlewarehq/middleware` into this fork. Append after every sync.

Procedure: [FORK_STRATEGY.md §5](./FORK_STRATEGY.md#5-the-upstream-sync-procedure).
Cadence: monthly, plus immediately for any upstream security fix.

Why this file exists: when something breaks three weeks after a sync, the first question is always
"what came in, and what did we have to resolve by hand?" Reconstructing that from git history is
possible but slow. Writing three lines at merge time is not.

---

| Date | Upstream ref merged | Commits | Files changed | Conflicts | Sentinels before → after | Smoke test | PR | Notes |
|---|---|---|---|---|---|---|---|---|
| _(no syncs yet — fork is at `844eb42` with zero divergence)_ | | | | | | | | |

---

## Column meanings

| Column | What to record |
|---|---|
| **Upstream ref merged** | The `upstream/main` SHA merged, so the exact state is recoverable |
| **Commits** | `git log --oneline <prev>..upstream/main \| wc -l` |
| **Files changed** | `git diff --stat` summary line |
| **Conflicts** | Count, and the files — name them, they are the ones to re-check next time |
| **Sentinels before → after** | `CLUSTOX:` count either side of the merge. **A drop means a resolution ate one of our changes.** |
| **Smoke test** | Pass/fail against the checklist in FORK_STRATEGY §5 step 4 |
| **PR** | Link to the reviewed sync PR |
| **Notes** | Behaviour changes, migrations, anything that needed a decision |

## Worked example of a filled row

| Date | Upstream ref merged | Commits | Files changed | Conflicts | Sentinels before → after | Smoke test | PR | Notes |
|---|---|---|---|---|---|---|---|---|
| 2026-09-01 | `abc1234` | 23 | 41 files, +892/-310 | 2 — `etl_code_factory.py`, `sync_data.py` | 14 → 14 | ✅ | #12 | Upstream added a Bitbucket provider; our registration line moved but survived. One new migration, applied cleanly. |

Note what the example shows: conflicts in **yellow-zone** registration points, resolved mechanically,
sentinel count unchanged. That is what a healthy sync looks like. Conflicts in red-zone files with a
falling sentinel count is the pattern to escalate on.
