-- migrate:up
-- CLUSTOX: Jira integration, Phase 2 (project selection) -- see
-- docs/JIRA_INTEGRATION_PROPOSAL.md. Mirrors "OrgRepo"/"TeamRepos" exactly
-- (org-level catalog + team join table), minus the code-specific columns
-- (default_branch, language, contributors, deployment_type, prod_branches)
-- that don't apply to a project-tracking tool.
--
-- idempotency_key is NOT the bare Jira project id the way OrgRepo's is the
-- bare GitLab project id -- GitLab project ids are unique across the one
-- shared gitlab.com instance, but every org here links its own independent
-- Jira site, and Jira Cloud project ids are small site-local integers
-- (starting at 10000) that two different orgs' sites can easily collide
-- on. Scoping it as "<provider>:<org_id>:<remote_id>" keeps it globally
-- unique the same way OrgRepo's happens to be, rather than assuming a
-- property Jira doesn't actually have.
CREATE TABLE "OrgProject" (
  id              uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  org_id          uuid REFERENCES "Organization"(id),
  key             varchar NOT NULL,
  name            varchar NOT NULL,
  provider        varchar NOT NULL,
  idempotency_key varchar NOT NULL,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX orgproject_unique_idempotency_key
  ON "OrgProject"(idempotency_key);

CREATE INDEX org_project_fetch_active_index
  ON "OrgProject" USING btree (org_id, is_active);

CREATE INDEX org_project_search_index
  ON "OrgProject" USING btree (org_id, name);

CREATE TABLE "TeamProjects" (
  team_id        uuid NOT NULL REFERENCES "Team"(id),
  org_project_id uuid NOT NULL REFERENCES "OrgProject"(id),
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, org_project_id)
);

CREATE INDEX team_projects_fetch_index
  ON "TeamProjects" USING btree (team_id, is_active);

CREATE INDEX team_projects_org_project_id_index
  ON "TeamProjects" USING btree (org_project_id);

-- migrate:down
DROP TABLE "TeamProjects";
DROP TABLE "OrgProject";
