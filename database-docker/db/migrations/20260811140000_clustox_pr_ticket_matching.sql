-- migrate:up
-- CLUSTOX: Jira integration, Phase 3 (ticket-PR matching) -- see
-- docs/JIRA_INTEGRATION_PROPOSAL.md step 4. A PR can reference more than
-- one ticket (real example found in this org's own PR history: a title
-- referencing "PZDA-544/546"), so this is a many-to-many join table, not
-- a single ticket_id column on PullRequest.
CREATE TABLE "PullRequestTicketMapping" (
  pr_id      uuid REFERENCES "PullRequest"(id),
  ticket_id  uuid REFERENCES "Ticket"(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pr_id, ticket_id)
);

CREATE INDEX pr_ticket_mapping_ticket_id_index
  ON "PullRequestTicketMapping" USING btree (ticket_id);

-- migrate:down
DROP TABLE "PullRequestTicketMapping";
