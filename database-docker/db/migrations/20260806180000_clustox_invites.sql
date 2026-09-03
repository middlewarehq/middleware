-- migrate:up
-- CLUSTOX: single-use invite links.
--
-- A superadmin generates a link and sends it over Slack; the invitee sets
-- their own password. This avoids a superadmin choosing and transmitting
-- someone else's password, which is what the current create-user flow
-- requires.
--
-- token_hash, not token: the link is a bearer credential, so anyone reading
-- this table should not be able to accept invitations. SHA-256 rather than
-- bcrypt is deliberate -- the token is 32 random bytes, so it is not
-- brute-forceable and a fast hash keeps acceptance a single indexed lookup
-- instead of a scan over every pending row.
CREATE TABLE "ClustoxInvite" (
  id           uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  token_hash   varchar NOT NULL UNIQUE,
  email        text NOT NULL,
  name         varchar NOT NULL,
  role         varchar NOT NULL CHECK (role IN ('SUPERADMIN','ADMIN')),
  -- Adopt an existing workspace instead of provisioning a new one.
  org_id       uuid REFERENCES "Organization"(id) ON DELETE SET NULL,
  created_by   uuid REFERENCES "Users"(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  -- Set on acceptance. Non-null means the link is spent.
  accepted_at  timestamptz,
  accepted_by  uuid REFERENCES "Users"(id) ON DELETE SET NULL,
  revoked_at   timestamptz
);

CREATE INDEX idx_clustox_invite_pending
  ON "ClustoxInvite"(expires_at)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- migrate:down
DROP TABLE "ClustoxInvite";
