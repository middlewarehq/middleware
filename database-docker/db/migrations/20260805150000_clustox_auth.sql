-- migrate:up
-- CLUSTOX: authentication and role-based access tables. Deliberately separate
-- from upstream "Users" so upstream migrations can never collide with ours.
CREATE TABLE "ClustoxUserAuth" (
  user_id       uuid PRIMARY KEY REFERENCES "Users"(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  role          varchar NOT NULL CHECK (role IN ('SUPERADMIN','ADMIN')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "ClustoxUserTeamAccess" (
  user_id    uuid NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  team_id    uuid NOT NULL REFERENCES "Team"(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, team_id)
);

CREATE INDEX idx_clustox_user_team_access_user ON "ClustoxUserTeamAccess"(user_id);

-- migrate:down
DROP TABLE "ClustoxUserTeamAccess";
DROP TABLE "ClustoxUserAuth";
