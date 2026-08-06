import * as yup from 'yup';

import { Endpoint, nullSchema } from '@/api-helpers/global';
import { assertRole } from '@/auth/guard';
import { listUnownedWorkspaces, listWorkspaces } from '@/auth/queries';

/**
 * Every workspace, for the SuperAdmin workspace switcher.
 *
 * A SuperAdmin owns no workspace, so without a way to choose one the whole
 * org-scoped UI has nothing to render. Selecting a workspace here sets the
 * viewing context; it does not change what they are permitted to reach, which
 * is everything.
 */
const endpoint = new Endpoint(nullSchema);

endpoint.handle.GET(nullSchema, async (req, res) => {
  assertRole((req as any).session, 'SUPERADMIN');

  const [all, unowned] = await Promise.all([
    listWorkspaces(),
    listUnownedWorkspaces()
  ]);
  const unownedIds = new Set(unowned.map((w) => w.id));

  // `owned` lets the user form offer adoption of a workspace that has no
  // admin -- notably the pre-multitenancy one holding the real data.
  res.send(all.map((w) => ({ ...w, owned: !unownedIds.has(w.id) })));
});

const putSchema = yup.object().shape({
  org_id: yup.string().uuid().required()
});

endpoint.handle.PUT(putSchema, async (req, res) => {
  assertRole((req as any).session, 'SUPERADMIN');

  // Viewing context only. Guards never consult this -- a SuperAdmin passes
  // every workspace check regardless of what is selected.
  res.setHeader(
    'set-cookie',
    `clustox-workspace=${req.payload.org_id};Path=/;HttpOnly;SameSite=Lax`
  );
  res.send({ org_id: req.payload.org_id });
});

export default endpoint.serve();
