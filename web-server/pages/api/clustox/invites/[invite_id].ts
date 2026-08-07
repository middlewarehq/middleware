import * as yup from 'yup';

import { Endpoint } from '@/api-helpers/global';
import { assertRole } from '@/auth/guard';
import { revokeInvite } from '@/auth/invites';

const pathSchema = yup.object().shape({
  invite_id: yup.string().uuid().required()
});

const endpoint = new Endpoint(pathSchema);

/** Revoke a pending invite, so a shared link stops working. */
endpoint.handle.DELETE(pathSchema, async (req, res) => {
  assertRole((req as any).session, 'SUPERADMIN');
  await revokeInvite(req.payload.invite_id);
  res.send({ ok: true });
});

export default endpoint.serve();
