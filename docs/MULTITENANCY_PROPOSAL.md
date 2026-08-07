# Middleware Fork — Authentication & Multitenancy

**For review and approval**
Prepared 2026-08-06 · Clustox/middleware · branch `feat/auth-rbac`

---

## 1. Where we are

Authentication and role-based access are **built, tested and pushed**. What works today:

- Login screen; nothing in the app is reachable without signing in
- Two roles: **SuperAdmin** and **Admin**
- SuperAdmin can create users, assign roles, and scope them
- Admins see only what they're scoped to; requesting anything else returns 403
- The analytics API is locked down — previously `curl http://<host>:9696/…` returned every
  team's metrics with no credentials at all
- Sign out, user management page, session expiry

156 frontend and 155 backend tests passing.

**One thing worth knowing:** the open-source version we forked ships with *no authentication of
any kind*. Anyone who could reach the URL saw everything, and the API was open to anyone on the
network. That's now closed.

---

## 2. The gap

The first meeting specified **multitenancy** — each Admin brings their own GitHub/GitLab
integration and their own projects, with SuperAdmin seeing across all of them.

What we built scopes access by **team** inside a single shared workspace. What's needed scopes by
**tenant**, where each Admin effectively has their own workspace.

The authentication layer is unaffected and fully reusable. What changes is *what access is measured
against*.

| Requirement | Status |
|---|---|
| SuperAdmin + Admin roles | ✅ Done |
| Login, sessions, password security | ✅ Done |
| SuperAdmin manages users | ✅ Done |
| API not bypassable | ✅ Done |
| Admin adds **their own** integration | ❌ Currently one shared integration |
| Admin adds **their own** projects | ❌ Projects are currently shared |
| SuperAdmin sees **all** projects | ⚠️ Sees all teams — right idea, wrong dimension |
| SuperAdmin **invites** admins | ❌ Not built |
| Multitenant | ❌ Single shared workspace |

---

## 3. The good news

We expected multitenancy to be a rewrite. It isn't.

The upstream database was **designed for multiple tenants** and then bootstrapped to only ever
create one. Every table already carries an organisation ID. The integration table's primary key is
literally *(provider, organisation)* — meaning **one GitHub account per organisation is already how
it was built to work**.

Only four places in the entire codebase assume a single tenant. Everything else already passes the
organisation through correctly.

In practical terms: **"one workspace per Admin" is the design the code was already shaped for**, not
something we bolt on. That materially reduces both the cost and the risk.

---

## 4. Proposed model

**Each Admin gets their own workspace.**

| | |
|---|---|
| **Admin** | Owns a workspace. Connects their own GitHub/GitLab account, adds their own projects and teams, sees only their own metrics. |
| **SuperAdmin** | Sits above all workspaces. Sees every project across every Admin, invites new Admins, manages users. Does not own a workspace. |

Concretely, this gives each Admin their own integration credentials, their own project list, and
their own dashboards — with a SuperAdmin view spanning all of them. It matches the meeting notes
directly.

**On integrations:** the note said this was undecided. Recommendation is that **Admins connect their
own**, with SuperAdmin able to see and revoke any of them. Reasons: it removes the SuperAdmin as a
bottleneck for onboarding, it's what the schema already supports, and it avoids one person holding
credentials for everyone else's repositories.

---

## 5. Decisions needed

Each has a recommendation. Approving all six as-is is a valid answer.

**Q1. Does a SuperAdmin have their own workspace, or sit above all of them?**
*Recommend: sits above, owns none.* Keeps "who can see what" simple and avoids the odd case of a
SuperAdmin's personal projects mixing into an org-wide view.

**Q2. Can two Admins track the same repository?**
*Recommend: yes, allow it.* The consequence is that the same repo gets synced once per Admin, using
each Admin's own credentials — duplicate API calls against GitHub. Acceptable at our scale, and
blocking it would create awkward "someone else claimed this repo" conflicts.

**Q3. How do invites work — email, or a link?**
*Recommend: invite links first.* A real email invite needs mail infrastructure we don't currently
have. A SuperAdmin-generated single-use link works immediately and can be sent over Slack. Email can
be added later without rework.

**Q4. What happens to the existing setup?**
There's already a live GitHub connection with two repos and two teams from testing.
*Recommend: it becomes the first Admin's workspace* rather than being discarded, so nothing is
re-entered.

**Q5. Do we still want team-level access inside a workspace?**
We built the ability to scope an Admin to specific teams. Under the new model an Admin owns their
whole workspace, so it may be unnecessary.
*Recommend: drop it for now.* It's already built and can be re-enabled later if a workspace grows
large enough to need it. Carrying unused permission levels adds confusion, not safety.

**Q6. Is the sync cost acceptable?**
Today one scheduled job syncs one workspace. Multitenant means syncing every workspace, each
against its own GitHub account and its own rate limit.
*Recommend: proceed, and add per-workspace sync status so failures are visible.* Right now a failed
sync reports success and simply shows no data — we hit this during testing and it cost real time to
diagnose.

---

## 6. Honest costs

- **Multitenancy is a data-model change**, not a settings toggle. It touches how every request
  resolves which workspace it belongs to.
- **Sync is the main scaling risk.** Each workspace syncs independently; GitHub rate limits are
  per-token, so this scales reasonably, but sync duration grows with the number of Admins.
- **This is a permanent fork change.** Upstream will not accept it — gated multi-tenant access is
  plausibly what their paid product sells. We carry it ourselves from here, which is why we've kept
  our changes marked and auditable so upstream updates can still be merged in.

---

## 7. Suggested sequence

1. **Merge the authentication work now.** It's complete, tested, and valuable on its own — it closes
   a real hole where the API was open to anyone on the network.
2. **Approve the decisions above**, then a detailed design for multitenancy.
3. **Build multitenancy**, then invites.

Splitting it this way means the security fix ships immediately rather than waiting behind a larger
piece of work.

---

## What I need

Approval on the model in §4, and answers to the six questions in §5 — or a simple "go with the
recommendations".
