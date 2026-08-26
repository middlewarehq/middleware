# Bitbucket Cloud integration — design

**Status:** phase 1 implemented and live-verified; phase 2 (Pipelines) pending
**Date:** 2026-08-25
**Delivery:** two sequential PRs from one design — code provider first, Pipelines second
**Estimate:** 4–5 days (phase 1), 2–3 days (phase 2)

Bitbucket Cloud joins GitHub and GitLab as a code provider, and Bitbucket
Pipelines joins GitHub Actions and Jenkins as a deployment source. Phase 1
lights up lead time, LOC, the contributor filter and revert-PR incidents for
Bitbucket repos; phase 2 adds deployment frequency from Pipelines. A team on
Bitbucket + Jenkins is fully served after phase 1 alone.

---

## Decisions

| Decision | Choice | Consequence |
|---|---|---|
| Target | **Bitbucket Cloud only** (v2 REST) | Server/Data Center is a different API; nothing here reuses for it, and nothing here blocks adding it later. |
| Auth | **Atlassian API token**, Basic auth `email:token` | Fits the existing token-modal pattern. App passwords are being phased out by Atlassian; OAuth is a different shape from every integration in this app. The modal gains one extra field (email) vs the PAT modals. |
| Token validation | **Server-side in the BFF** | Bitbucket's API does not serve CORS for Basic auth from arbitrary origins, so the browser-side check GitHub uses is impossible. GitLab's modal already validates server-side — same pattern. |
| Delivery | **Two sequential PRs** | Phase 1 ships value alone; a Pipelines problem cannot hold code metrics hostage. Same playbook as Jenkins + contributor filter. |
| Scope unit | **Workspace** = org | Bitbucket's workspace is the org-level container. Repo listing and sync iterate the workspaces the token can see. |
| Revert detection | **`revert-pr-<number>` branch pattern** | Bitbucket's own Revert button creates this branch — a structured link to the original PR. See the phase-1 section for why the title heuristic was dropped. |
| Rate limits | **429 = pause + resume, never fail** | ~1,000 req/hr on Cloud. First sync of a large repo will hit it; the bookmark makes stopping safe. |

**No database migration anywhere.** `CodeProvider.BITBUCKET` and
`RepoWorkflowProviders.BITBUCKET_PIPELINES` are enum values persisted into
`character varying` columns, like every provider before them.

---

## Phase 1 — code provider

### New pieces, each mirroring a GitLab counterpart

| New | Mirrors | Job |
|---|---|---|
| `mhq/exapi/bitbucket.py` | `exapi/gitlab.py` | v2 REST client: user, workspaces, repos, PRs, activity, diffstat |
| `mhq/service/code/sync/etl_bitbucket_handler.py` | `etl_gitlab_handler.py` | The four-method `CodeProviderETLHandler` contract |
| `mhq/service/code/sync/revert_prs_bitbucket_sync.py` | `revert_pr_gitlab_sync.py` | Revert-PR mapping for CFR incidents |
| `ConfigureBitbucketModalBody.tsx` | GitLab modal | Email + API token entry, server-side validation |
| Bitbucket branch in `git_org_repos.ts` | GitLab GraphQL branch | Repo listing per workspace |

Plus one-line registrations: `CodeProvider.BITBUCKET`, a third branch in
`CodeETLFactory`, the frontend's existing `Integration.BITBUCKET` stub wired
to the new modal, and the integrations card on the dashboard.

### API endpoints used

```
GET /2.0/user                                       token validity
GET /2.0/user/permissions/workspaces                org discovery (/2.0/workspaces is dead: 410 CHANGE-2770; scoped tokens cannot enumerate at all)
GET /2.0/repositories/{workspace}                   repo listing (pagelen=50)
GET /2.0/repositories/{ws}/{slug}/pullrequests      PRs, ?q=updated_on>bookmark
GET /2.0/repositories/{ws}/{slug}/pullrequests/{id}/activity   reviews/approvals
GET /2.0/repositories/{ws}/{slug}/pullrequests/{id}/diffstat   additions/deletions
```

### Sync flow

Incremental via the existing `CodeBookmarkType` mechanism, exactly as GitHub
and GitLab sync: per repo, fetch PRs with `updated_on` after the bookmark,
newest last; per PR, one activity call (first response time, approvals) and
one diffstat call (`code_stats` — the LOC feed); advance the bookmark only
past PRs fully adapted and stored.

**Rate limit maths, stated up front:** a first-ever sync of a 500-PR repo
costs roughly 3 calls per PR page + activity + diffstat ≈ 1,100–1,500
requests against a ~1,000/hr ceiling. It WILL 429. On 429 the handler stops
the batch, keeps what it has, leaves the bookmark at the last stored PR, logs
one warning with the reset time, and the next scheduled sync resumes. After
the first sync, incremental cost is trivial.

### Field mapping (the boundary table — check both sides)

| Ours | Bitbucket v2 | Notes |
|---|---|---|
| `state` MERGED / OPEN / CLOSED | `state` MERGED / OPEN / DECLINED (+ SUPERSEDED) | DECLINED and SUPERSEDED → CLOSED |
| `author` | `author.nickname`, uuid fallback (uuid kept in `data`) | The contributor dropdown lists `author` strings verbatim and the schema has no display indirection, so a stored uuid would surface as `{a1b2…}` in the UI. Nickname renames split history under two handles — the same accepted cost GitHub logins carry today. |
| `base_branch` / `head_branch` | `destination.branch.name` / `source.branch.name` | |
| `merge_commit_sha` | `merge_commit.hash` | **Null on unmerged PRs** — adapt per PR, never assume |
| `state_changed_at` (merge time) | `updated_on` when state=MERGED | Bitbucket has no separate merged_at; `updated_on` at merge is the closest truth and is what lead time keys on |
| `first_response_time` | earliest of comment / approval / changes-requested in `activity` | The activity feed mixes event kinds in one stream; parse defensively |
| `code_stats.additions/deletions/changed_files` | sum over `diffstat` values (`lines_added`, `lines_removed`, entry count) | Separate request; on failure the PR syncs with `code_stats` absent — LOC undercounts honestly rather than the PR vanishing from four metrics |
| reviewers | `participants` with `role: REVIEWER` | |

### Revert detection (CFR)

Bitbucket's own "Revert" button creates the branch `revert-pr-<number>` — a
structured link to the original PR's number. Detection matches that branch
pattern in both directions (a revert syncing after its original, and an
original syncing after its revert), mirroring how the GitLab handler matches
`revert-<hash>` branches. This is STRONGER than the title-prefix heuristic
this spec originally proposed: a title alone identifies a PR as "a revert"
but names no target, and a mapping without both ends is useless to CFR — so
the title heuristic was dropped during implementation, not weakened.
A manual revert from a hand-named branch goes undetected; accepted and
recorded.

---

## Phase 2 — Pipelines as a deployment source

`RepoWorkflowProviders.BITBUCKET_PIPELINES = "bitbucket_pipelines"`, an
`etl_bitbucket_pipelines_handler.py` implementing the two-method
`WorkflowProviderETLHandler` contract (`check_pat_validity`,
`get_workflow_runs`), and a third branch in the workflows factory.

```
GET /2.0/repositories/{ws}/{slug}/pipelines/?sort=-created_on
```

| Ours | Pipelines | Notes |
|---|---|---|
| deployment | completed pipeline on the repo's production branch | Same definition Jenkins uses |
| `conducted_at` | `completed_on` | |
| `status` SUCCESS / FAILURE | `state.result.name` SUCCESSFUL / FAILED / STOPPED | STOPPED → FAILURE; anything unrecognised skips that run with a warning, never the batch |
| `event_actor` | `creator.nickname` (fallback `trigger` account) | Contributor filter works on day one |
| run URL | `links.html.href` or built from build_number | Deep link from the deployments drill-down |

The repo→pipeline mapping reuses the workflow-selection UI built for Jenkins.
Auth reuses the phase-1 integration row — one Bitbucket link serves both
phases; phase 2 adds no second token.

---

## Error handling

Fail loud at the boundary, degrade visibly, never render a plausible wrong
answer:

- **Token invalid/revoked**: caught at link time and at every sync start;
  sync record fails with the provider's error body, visible in the existing
  sync-status UI. The message says "revoked or expired" — the API cannot
  distinguish them.
- **429**: pause + resume as above. Tested in both failure directions:
  bookmark never advances past unfetched PRs (data loss) and never re-covers
  stored ones (double count).
- **Malformed objects**: one bad PR or pipeline run skips that item with a
  warning, never the batch — the Jenkins lesson, applied from day one.
- **Diffstat failure**: PR syncs without `code_stats`; LOC undercounts and
  claims nothing false. Dropping the PR would corrupt four metrics to
  protect one.
- **Nothing downstream changes.** Metrics read provider-agnostic tables; a
  Bitbucket defect is a sync defect, visible in sync status — never a silent
  number shift.

## Testing

- **Contract tests on recorded payloads**: real captured Bitbucket JSON (PR
  page, activity, diffstat, pipeline run) as fixtures, asserting the adapted
  models. Real vendor JSON is what stops a test from encoding a broken shape
  back to itself — this project has shipped that bug twice.
- **The 429 bookmark test**, both directions.
- **Handler tests** mirroring `test_etl_gitlab_handler.py`: PR states, review
  timestamps, null `merge_commit` on open PRs, revert-title matching with a
  negative case.
- **Provider-isolation regression**: Bitbucket linked + zero Bitbucket repos
  selected ⇒ every existing GitHub/GitLab number byte-identical.
- **Live verification before any PR opens**: a real scratch workspace with a
  few PRs, linked through the real modal, synced by the real scheduler,
  numbers on the real dashboard. Every serious bug in the last three
  features was invisible until exactly this step.

## Deliberately excluded

- **No Bitbucket Server / Data Center.** Different API, own effort, nothing
  here blocks it.
- **No OAuth flow.** Token-based like every other integration here; OAuth is
  a product decision for all providers at once, not a rider on this one.
- **No cross-provider identity merging.** A person on GitHub and Bitbucket
  appears twice — already true for GitHub+GitLab, unchanged.
- **No Bitbucket Deployments-API environments.** Pipelines runs on the prod
  branch are the deployment signal, matching how Jenkins is modelled; the
  richer environments API can layer on later without schema change.
- **No incident provider.** Bitbucket has no issues-based incident source
  worth modelling; incidents remain reverts + the existing providers.
