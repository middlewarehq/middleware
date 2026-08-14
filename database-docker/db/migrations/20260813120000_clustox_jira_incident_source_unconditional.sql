-- migrate:up
-- CLUSTOX: JIRA_ISSUE moved from an opt-in IncidentSource to an
-- unconditional one -- see default_settings_data.py's
-- INCIDENT_SOURCES_SETTING default for the reasoning (a reopened ticket
-- is the same kind of "the fix didn't hold" signal a revert PR already
-- is for GIT_REPO, which has never had an opt-out toggle either).
--
-- That default is only ever consulted the first time an org's
-- INCIDENT_SOURCES_SETTING is read (get_or_create, see
-- IncidentsIntegrationService._get_or_create_incident_source_setting) --
-- every org that had already read it before this change has its own
-- persisted row, missing JIRA_ISSUE, that the code-level default no
-- longer touches. This backfills those existing rows so the new
-- unconditional default actually reaches every org, not just new ones.
UPDATE "Settings"
SET data = jsonb_set(
  data,
  '{incident_sources}',
  (COALESCE(data->'incident_sources', '[]'::jsonb) || '["JIRA_ISSUE"]'::jsonb)
),
updated_at = now()
WHERE setting_type = 'INCIDENT_SOURCES_SETTING'
  AND NOT (COALESCE(data->'incident_sources', '[]'::jsonb) @> '["JIRA_ISSUE"]'::jsonb);

-- migrate:down
-- Best-effort only: removes JIRA_ISSUE from every row this migration
-- could have touched, including any org that had genuinely opted in on
-- its own before this change shipped -- that distinction isn't
-- recoverable from data alone once merged.
UPDATE "Settings"
SET data = jsonb_set(
  data,
  '{incident_sources}',
  COALESCE(
    (
      SELECT jsonb_agg(elem)
      FROM jsonb_array_elements(data->'incident_sources') elem
      WHERE elem <> '"JIRA_ISSUE"'
    ),
    '[]'::jsonb
  )
),
updated_at = now()
WHERE setting_type = 'INCIDENT_SOURCES_SETTING'
  AND (COALESCE(data->'incident_sources', '[]'::jsonb) @> '["JIRA_ISSUE"]'::jsonb);
