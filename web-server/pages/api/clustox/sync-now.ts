import { handleSyncServerRequest } from '@/api-helpers/axios';
import { Endpoint, nullSchema } from '@/api-helpers/global';
import { assertRole } from '@/auth/guard';

/**
 * Trigger a sync across every workspace, rather than waiting up to 30 minutes
 * for cron.
 *
 * Superadmin only: this runs every workspace's sync against every workspace's
 * provider token, so it is not an action scoped to one admin's workspace.
 */
const endpoint = new Endpoint(nullSchema);

endpoint.handle.POST(nullSchema, async (req, res) => {
  assertRole((req as any).session, 'SUPERADMIN');

  const body = await handleSyncServerRequest('/sync', { method: 'post' });
  res.send(body);
});

export default endpoint.serve();
