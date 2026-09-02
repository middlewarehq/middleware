-- migrate:up
-- CLUSTOX: OrgRepo carried TWO unique constraints without org_id, and either
-- one makes two workspaces tracking the same repo collide:
--
--   orgrepo_unique_idempotency_key  UNIQUE (idempotency_key)
--   one_repo_per_provider           UNIQUE (org_name, name, provider)
--
-- The idempotency key is the provider's repo id (GitHub numeric id, GitLab
-- project id, Bitbucket uuid) and (org_name, name, provider) is the repo's
-- provider-side identity -- both are the same values in every workspace that
-- links the repo. The second workspace's team save died on the service-level
-- cross-org check ("Data integrity error, matching idempotency key across
-- orgs"), and with that check gone it would die on one_repo_per_provider
-- instead (caught live, locally, before this shipped). Scoping BOTH per org
-- lets each workspace own its row, which is what org_id on the table always
-- implied.
--
-- Both new constraints are strictly weaker than the old ones, so existing
-- data always satisfies them -- no data fix-up needed before applying.
ALTER TABLE "OrgRepo"
  DROP CONSTRAINT orgrepo_unique_idempotency_key;

ALTER TABLE "OrgRepo"
  ADD CONSTRAINT orgrepo_unique_org_idempotency_key UNIQUE (org_id, idempotency_key);

ALTER TABLE "OrgRepo"
  DROP CONSTRAINT one_repo_per_provider;

ALTER TABLE "OrgRepo"
  ADD CONSTRAINT one_repo_per_provider_per_org UNIQUE (org_id, org_name, name, provider);

-- migrate:down
-- NOTE: restoring the global constraints FAILS if two orgs have since linked
-- the same repo -- exactly the state the up-migration exists to allow. To
-- roll back after that, one org's duplicate rows must be deleted first.
ALTER TABLE "OrgRepo"
  DROP CONSTRAINT one_repo_per_provider_per_org;

ALTER TABLE "OrgRepo"
  ADD CONSTRAINT one_repo_per_provider UNIQUE (org_name, name, provider);

ALTER TABLE "OrgRepo"
  DROP CONSTRAINT orgrepo_unique_org_idempotency_key;

ALTER TABLE "OrgRepo"
  ADD CONSTRAINT orgrepo_unique_idempotency_key UNIQUE (idempotency_key);
