import * as yup from 'yup';

import { Endpoint, nullSchema } from '@/api-helpers/global';
import { assertRole } from '@/auth/guard';
import { createInvite, listPendingInvites } from '@/auth/invites';
import { getAuthUserByEmail } from '@/auth/queries';
import { ClustoxRole } from '@/auth/types';
import { Errors, ResponseError } from '@/constants/error';

const postSchema = yup.object().shape({
  name: yup.string().required(),
  email: yup.string().email().required(),
  role: yup.string().oneOf(['SUPERADMIN', 'ADMIN']).required(),
  org_id: yup.string().uuid().nullable().optional()
});

const endpoint = new Endpoint(nullSchema);

endpoint.handle.GET(nullSchema, async (req, res) => {
  assertRole((req as any).session, 'SUPERADMIN');
  res.send(await listPendingInvites());
});

endpoint.handle.POST(postSchema, async (req, res) => {
  const session = assertRole((req as any).session, 'SUPERADMIN');

  const existing = await getAuthUserByEmail(req.payload.email);
  if (existing) throw new ResponseError(Errors.INSUFFICIENT_PARAMS, 409);

  const { token, expiresAt } = await createInvite({
    name: req.payload.name,
    email: req.payload.email,
    role: req.payload.role as ClustoxRole,
    orgId: req.payload.org_id ?? null,
    createdBy: session.userId
  });

  // The raw token is returned exactly once, here. Only its hash is stored, so
  // it cannot be recovered later -- a lost link has to be reissued.
  res.send({
    invite_url: `${process.env.NEXTAUTH_URL}/accept-invite?token=${token}`,
    expires_at: expiresAt.toISOString()
  });
});

export default endpoint.serve();
