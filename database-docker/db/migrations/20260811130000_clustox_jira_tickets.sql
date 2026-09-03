-- migrate:up
-- CLUSTOX: Jira integration, Phase 2 (issue sync) -- see
-- docs/JIRA_INTEGRATION_PROPOSAL.md. "Ticket" (current state) +
-- "TicketState" (append-only status-transition history) mirror
-- "PullRequest"/"PullRequestEvent" -- a current-state row plus a
-- separate event-history table, rather than trying to cram history into
-- the current-state row.
--
-- Deliberately no rigid column per Jira field (summary, assignee,
-- reporter, issue type, ...): those live in the "data" JSONB payload,
-- the same choice PullRequest/PullRequestEvent already made for their
-- own provider payloads ("data"/"meta"). Jira custom fields vary per
-- instance (e.g. story points is a differently-numbered customfield_*
-- per site) -- a fixed column per field would mean a migration every
-- time a new field is wanted, where JSONB just needs a new @property.
-- status/status_category are still real columns because cycle-time
-- queries need to filter/group on them directly.
CREATE TABLE "Ticket" (
  id               uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  org_project_id   uuid REFERENCES "OrgProject"(id),
  key              varchar NOT NULL,
  provider         varchar NOT NULL,
  status           varchar NOT NULL,
  status_category  varchar,
  idempotency_key  varchar NOT NULL,
  data             jsonb,
  -- Jira's own created/updated timestamps -- NOT this row's own
  -- bookkeeping (see created_in_db_at/updated_in_db_at below). updated_at
  -- is the incremental-sync bookmark cursor (see ProjectIssuesBookmark).
  created_at       timestamptz NOT NULL,
  updated_at       timestamptz NOT NULL,
  created_in_db_at timestamptz NOT NULL DEFAULT now(),
  updated_in_db_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ticket_unique_idempotency_key
  ON "Ticket"(idempotency_key);

CREATE INDEX ticket_org_project_fetch_index
  ON "Ticket" USING btree (org_project_id, updated_at);

CREATE TABLE "TicketState" (
  id               uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  ticket_id        uuid REFERENCES "Ticket"(id),
  from_status      varchar,
  to_status        varchar NOT NULL,
  changed_at       timestamptz NOT NULL,
  idempotency_key  varchar NOT NULL,
  data             jsonb,
  created_in_db_at timestamptz NOT NULL DEFAULT now(),
  updated_in_db_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ticket_state_unique_idempotency_key
  ON "TicketState"(idempotency_key);

CREATE INDEX ticket_state_ticket_fetch_index
  ON "TicketState" USING btree (ticket_id);

-- Incremental-sync watermark, one per (project, provider) -- mirrors
-- "Bookmark" (org repos) and "RepoWorkflowRunsBookmark", just scoped to
-- OrgProject instead of OrgRepo. Not reusing "Bookmark" itself: its
-- repo_id column has a real FK to "OrgRepo" at the DB level, so an
-- OrgProject id would be rejected by that constraint.
CREATE TABLE "ProjectIssuesBookmark" (
  org_project_id uuid REFERENCES "OrgProject"(id),
  provider       varchar NOT NULL,
  bookmark       varchar,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_project_id, provider)
);

-- migrate:down
DROP TABLE "ProjectIssuesBookmark";
DROP TABLE "TicketState";
DROP TABLE "Ticket";
