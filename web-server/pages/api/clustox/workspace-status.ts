import { handleSyncServerRequest } from '@/api-helpers/axios';
import { Endpoint, nullSchema } from '@/api-helpers/global';
import { assertAuthenticated, canAccessAllWorkspaces } from '@/auth/guard';
import { listWorkspaceSummaries } from '@/auth/queries';

type SyncRun = {
  org_id: string;
  started_at: string | null;
  finished_at: string | null;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
  detail: string | null;
};

/**
 * Workspaces with their latest sync outcome.
 *
 * Answers "did last night's sync actually work?" -- which previously required
 * reading a log file before it rotated away.
 *
 * A superadmin sees every workspace; an admin sees only their own, so the same
 * page serves both without leaking the existence of other workspaces.
 */
const endpoint = new Endpoint(nullSchema);

endpoint.handle.GET(nullSchema, async (req, res) => {
  const session = assertAuthenticated((req as any).session);

  const summaries = await listWorkspaceSummaries();

  const visible = canAccessAllWorkspaces(session)
    ? summaries
    : summaries.filter((w) => w.id === session.orgId);

  // The sync server owns run history. If it is unreachable, report the
  // workspaces without status rather than failing the whole page -- an
  // unknown sync state is still more useful than an error screen.
  let runs: SyncRun[] = [];
  try {
    const body = await handleSyncServerRequest<{ results: SyncRun[] }>(
      '/sync/status'
    );
    runs = body?.results ?? [];
  } catch {
    runs = [];
  }

  res.send(
    visible.map((w) => {
      const run = runs.find((r) => r.org_id === w.id) ?? null;
      return {
        ...w,
        lastSync: run
          ? {
              status: run.status,
              finished_at: run.finished_at,
              started_at: run.started_at,
              detail: run.detail
            }
          : null
      };
    })
  );
});

export default endpoint.serve();
