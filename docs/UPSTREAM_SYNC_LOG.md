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
| _(no syncs yet)_ | | | | | | | | |

## Current divergence baseline

Recorded 2026-08-06, after authentication, RBAC and multitenancy. **The first sync compares
against these numbers.**

| | |
|---|---|
| Fork point | `844eb42` |
| Modified upstream files | **30** |
| New files | **48** |
| `CLUSTOX:` sentinel lines | **66** |

> Superseded an earlier baseline of 19 / 26 / 33, recorded after the auth work and left stale
> through the multitenancy branch. A stale baseline is worse than none: it would have raised a
> false alarm on the very first sync, and the natural response to a tripwire that cries wolf is
> to stop trusting it. Re-record this after every feature branch, not just before a sync.

Regenerate any time:

```bash
# modified upstream files
git diff --name-only 844eb42..HEAD | while read -r f; do
  git cat-file -e 844eb42:"$f" 2>/dev/null && echo "$f"
done | wc -l

# sentinel lines
grep -rn "CLUSTOX" --include='*.py' --include='*.ts' --include='*.tsx' \
  --include='*.sql' --include='*.sh' --include='*.txt' --include='*.js' . \
  | grep -v node_modules | grep -v '^./docs/' | wc -l
```

**The 26 files carrying real edits** (the other four are generated or append-only: `schema.sql`,
`yarn.lock`, `package.json`, `env.example`). Regenerate with:

```bash
git diff --name-only 844eb42..HEAD | while read -r f; do
  git cat-file -e 844eb42:"$f" 2>/dev/null && echo "$f"
done | grep -vE "schema.sql|yarn.lock|package.json|env.example"
```

**Check these three first on any conflict:**

| File | Why it matters |
|---|---|
| `web-server/src/api-helpers/global.ts` | The single enforcement point for authentication **and** workspace/team scoping across every BFF route. A bad merge here silently disables access control everywhere. |
| `backend/analytics_server/mhq/api/sync.py` | Rewritten to sync every workspace. Upstream's version syncs one org; taking theirs would silently stop syncing all but one workspace, with no error. |
| `web-server/pages/api/resources/orgs/[org_id]/teams/v2.ts` | Names the team `id`, not `team_id`, so central scoping does not cover it. It carries explicit `assertTeamAccess` calls; losing them reopens a cross-workspace hole. |

Regression tests guarding these: `endpoint-team-scope.test.ts`, `workspace-guard.test.ts`,
`tests/clustox_auth/test_sync_run.py`, and `e2e/multitenancy.spec.ts` — the last covers the
cross-workspace delete that the central guard cannot see.

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
