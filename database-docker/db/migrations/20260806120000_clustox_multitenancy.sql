-- migrate:up
-- CLUSTOX: multitenancy. Each ADMIN owns a workspace (an Organization);
-- SUPERADMIN sits above all of them and owns none.
--
-- No schema change is needed: upstream's "Users".org_id already exists and is
-- already nullable, and every other table already carries org_id. Upstream
-- simply only ever created one Organization. This migration only corrects the
-- data left behind by the single-workspace bootstrap.

-- A superadmin must not own a workspace, or their view would be scoped to it.
UPDATE "ClustoxUserAuth" a
SET updated_at = now()
FROM "Users" u
WHERE u.id = a.user_id AND a.role = 'SUPERADMIN';

UPDATE "Users" u
SET org_id = NULL
FROM "ClustoxUserAuth" a
WHERE a.user_id = u.id AND a.role = 'SUPERADMIN';

-- migrate:down
-- Reattach any orphaned superadmin to the oldest workspace, which is what the
-- single-workspace bootstrap would have done.
UPDATE "Users" u
SET org_id = (SELECT id FROM "Organization" ORDER BY created_at ASC LIMIT 1)
FROM "ClustoxUserAuth" a
WHERE a.user_id = u.id AND a.role = 'SUPERADMIN' AND u.org_id IS NULL;
