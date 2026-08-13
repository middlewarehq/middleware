-- migrate:up
-- CLUSTOX: Jira integration -- Sprint rollup chart (docs/
-- JIRA_INTEGRATION_PROPOSAL.md §6D). "Sprint" mirrors "OrgProject"'s
-- shape (org-scoped catalog row with an idempotency_key), but stores
-- planned/completed issue COUNTS directly rather than a per-ticket
-- sprint-membership join table -- the rollup chart only ever needs
-- "how many were planned vs. shipped, per sprint," never per-ticket
-- detail, so a join table here would be speculative structure with no
-- current consumer (YAGNI).
--
-- No bookmark table for this, unlike ProjectIssuesBookmark: a project
-- typically has a small, bounded number of sprints (re-fetching all of
-- them each cycle is cheap), and a sprint's completed count can keep
-- changing after it closes (a straggler ticket resolved late) --
-- unlike a ticket's own append-only status history, there's no safe
-- "only look at what changed since X" watermark here.
CREATE TABLE "Sprint" (
  id               uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  org_project_id   uuid REFERENCES "OrgProject"(id),
  provider         varchar NOT NULL,
  external_id      varchar NOT NULL,
  name             varchar NOT NULL,
  state            varchar NOT NULL,
  start_date       timestamptz,
  end_date         timestamptz,
  planned_count    integer NOT NULL DEFAULT 0,
  completed_count  integer NOT NULL DEFAULT 0,
  idempotency_key  varchar NOT NULL,
  created_in_db_at timestamptz NOT NULL DEFAULT now(),
  updated_in_db_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX sprint_unique_idempotency_key
  ON "Sprint"(idempotency_key);

CREATE INDEX sprint_org_project_fetch_index
  ON "Sprint" USING btree (org_project_id, start_date);

-- migrate:down
DROP TABLE "Sprint";
