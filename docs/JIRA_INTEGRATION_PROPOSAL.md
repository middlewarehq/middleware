# Jira Integration — Ticket-Linked DORA Metrics

**For review and approval**
Prepared 2026-08-10 · Clustox/middleware

---

## 1. What this is

Today, DORA metrics (Lead Time for Changes, Cycle Time, etc.) start the clock at the **first
commit**. This adds Jira as a linked data source so the clock can start earlier — at the moment a
ticket was created — and lets teams see how their Jira workflow (sprints, ticket status) relates to
what actually shipped.

In one sentence: **link Jira tickets to the PRs that closed them, so "idea to production" is a real,
measurable number instead of just "commit to production."**

---

## 2. The good news — this isn't starting from zero

This fork is a strip-down of an upstream product that **already had Jira support**, later removed.
The schema, error handling, and naming are still there, just disconnected:

| Already exists, unused | What it's for |
|---|---|
| `Integration.JIRA` enum | Marks Jira as a linkable provider, same list as GitHub/GitLab |
| `Integration` table (generic, works today) | Stores an encrypted token per org per provider — no changes needed to store a Jira token |
| `IntegrationGroup.PROJECT` | The category Jira belongs to, alongside `CODE` (GitHub/GitLab) |
| `OrgProject` / `TeamProjects` tables | Exactly the shape needed for "which Jira project belongs to which team" — mirrors how repos map to teams today |
| `Tickets` / `TicketState` tables | Landing tables for issues and their status history — already has fields for sprint, story points, status |
| Jira error codes + banner UI | "Your Jira token expired" messaging is already wired up, just never triggered |

**What's actually missing:** the Python backend doesn't yet recognize Jira as a provider, there's no
job that pulls data *from* Jira, and nothing yet matches a PR to the ticket it closes. Those three
gaps are the real work — everything else is reusable as-is.

---

## 3. What we're required to have

To connect an organization's Jira, we need three things from whoever sets it up (a Jira admin or
any user with access to the relevant projects):

| Field | What it is | Where to get it |
|---|---|---|
| **Jira Site URL** | e.g. `yourcompany.atlassian.net` | Already known — it's the URL they use to open Jira |
| **Email** | The Atlassian account email | Their own login email |
| **API Token** | A personal access token for that account | Generated at `id.atlassian.com/manage-profile/security/api-tokens` — takes about 30 seconds |

No Jira admin approval or app installation is required — this uses the same kind of personal API
token GitHub/GitLab linking already asks for, just with an email attached (Jira Cloud's API uses
email + token instead of a single token).

---

## 4. What we'll fetch

Once linked, we pull two kinds of data, both **read-only** — nothing is written back to Jira in this
phase:

1. **Projects** — the list of Jira projects the linked account can see, so a team can pick which
   one(s) it works out of (a team might map to one Jira project, or several).
2. **Issues, for the projects a team has selected** — ticket key, summary, status, assignee,
   reporter, story points, sprint, and **status history** (when it moved from "To Do" → "In
   Progress" → "Done", etc.). This is what lets us measure time-in-status, not just current status.

Fetching happens on a schedule (same mechanism as the existing GitHub/GitLab sync), pulling only
what's changed since the last sync — not the whole project history every time.

---

## 5. How it will work — the flow

```
 1. Link Jira            →  Site URL + email + API token, verified with a test call
                             (mirrors the existing "Configure GitHub" flow)

 2. Pick projects         →  For each team: which Jira project(s) does it work out of?
                             (mirrors the existing repo-picker in team settings)

 3. Sync runs on schedule →  Pull issues + status history for selected projects
                             (new step alongside the existing repo/incident sync jobs)

 4. Match tickets to PRs  →  Scan each PR's title and branch name for a ticket key
                             (e.g. a PR titled "PAY-482: fix refund rounding" or a
                             branch named "PAY-482-fix-rounding" both match "PAY-482")

 5. Metrics + UI update   →  Once a PR is matched to a ticket, its lead time can include
                             the ticket's own timeline, and ticket-only metrics (sprint
                             velocity, cycle time) become available independent of code
```

Step 4 is the one genuinely new piece of logic in this whole integration — everything else follows
an existing pattern already used for GitHub/GitLab.

---

## 6. What we'll display

**A. Integrations page** — a third card next to GitHub/GitLab, same look: shows "Linked" once
connected, "Link" to connect, standard unlink flow.

**B. Team settings** — a new "Projects" tab next to the existing "Repos" tab, where a team checks
off which Jira project(s) it's tracking against.

**C. DORA Metrics page — two additions:**

- **Extended Lead Time breakdown.** The existing phase chart (`first commit → PR opened → review →
  merge → deploy`) gets an optional leading phase, `ticket created → first commit`, for any PR that
  matched a ticket. This is the actual payoff of the whole integration — a true "idea to production"
  number.
- **Ticket Cycle Time widget.** Independent of code: how long tickets spend in each status, sourced
  from `TicketState`. Useful even for teams that want workflow visibility without caring about the
  code-metrics correlation.

**D. Sprint rollup chart** — tickets planned vs. shipped per sprint, and velocity trend, using the
sprint data Jira already tracks.

**E. Data-hygiene callout** — a small, honest counter: *"14 PRs merged this week with no linked
ticket."* This surfaces process gaps (people not following a ticket-naming convention) rather than
silently having those PRs excluded from ticket-aware metrics with no explanation.

---

## 7. Decisions needed

**Q1. What's the actual ticket-key format your team uses in PR titles/branches?**
The matching in step 4 needs a real pattern to match against — Jira's default is
`[PROJECT-KEY]-[NUMBER]` (e.g. `PAY-482`), but teams sometimes prefix branches differently (e.g.
`feature/PAY-482-...` vs `PAY-482/...`). *Recommend: confirm the convention(s) actually in use before
building the matcher, rather than guessing and re-tuning later.*

**Q2. How often should Jira sync run?**
GitHub/GitLab sync already runs on a schedule; Jira can either share that cadence or run
independently. *Recommend: same cadence as the existing repo sync* — no reason for it to be
different, and it's one less schedule to reason about.

**Q3. Should a PR with no matching ticket block anything, or just be a visibility callout?**
*Recommend: visibility only (§6E).* Blocking merges on ticket-linking is a process decision separate
from this integration and would need its own discussion.

---

## 8. Honest costs

- **Phase 4 (ticket-PR matching) is the one piece with real design risk.** Everything before it is
  "wire up an existing pattern to a new provider"; this step is genuinely new logic, and its accuracy
  depends entirely on how consistently the team already follows a ticket-naming convention.
- **This is read-only from Jira's side in phase 1.** No comments, transitions, or writes back to
  Jira — keeps the initial scope safe and reversible. Bi-directional sync (e.g. posting deploy status
  as a Jira comment) would be a deliberate later phase, not part of this proposal.
- **Sync cost scales with linked projects**, same as GitHub/GitLab — each org's Jira token has its
  own API rate limit, so this doesn't compound against other orgs' syncs.

---

## 9. Suggested sequence

Each phase below ships independently and is demoable on its own — there's no need to build all four
before anything is usable.

1. **Link Jira** (§3) — a working "Linked" badge and stored credentials. No visible metrics change
   yet, but it's the foundation everything else needs.
2. **Project selection + sync** (§4, §6B) — Jira issues start landing in the database; the Ticket
   Cycle Time widget (§6C) becomes possible on its own, independent of code data.
3. **Ticket-PR matching** (§5 step 4) — the risky, judgment-heavy piece; needs Q1 answered first.
4. **Metrics + UI** (§6) — Extended Lead Time breakdown, sprint rollup, and the data-hygiene
   callout, once matching is in place.

---

## What I need

Answers to the three questions in §7 (or "go with the recommendations"), and a go/no-go on starting
with Phase 1.
