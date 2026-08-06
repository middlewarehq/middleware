-- migrate:up
-- CLUSTOX: per-workspace sync outcomes.
--
-- Upstream's POST /sync returns 200 whether every repo synced or every repo
-- failed, and the only record of what happened is a log file capped at 512KB
-- with no rotation history. "Sync succeeded but the numbers are wrong" was the
-- expected failure signature, and diagnosing it meant reading logs before they
-- rotated away.
--
-- With one workspace that was merely awkward. With one sync per workspace it
-- becomes untenable: a single failing workspace is invisible among the ones
-- that worked.
CREATE TABLE "ClustoxSyncRun" (
  id           uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  org_id       uuid NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz,
  status       varchar NOT NULL CHECK (status IN ('RUNNING','SUCCESS','FAILED','SKIPPED')),
  -- Why a run was skipped, or how it failed. Null on success.
  detail       text
);

CREATE INDEX idx_clustox_sync_run_org_started
  ON "ClustoxSyncRun"(org_id, started_at DESC);

-- migrate:down
DROP TABLE "ClustoxSyncRun";
