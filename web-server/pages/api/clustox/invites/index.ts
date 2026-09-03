import * as yup from 'yup';

import { Endpoint, nullSchema } from '@/api-helpers/global';
import { assertRole } from '@/auth/guard';
import {
  createInvite,
  listPendingInvites,
  markInviteEmailed
} from '@/auth/invites';
import { getAuthUserByEmail } from '@/auth/queries';
import { ClustoxRole } from '@/auth/types';
import { Table } from '@/constants/db';
import { Errors, ResponseError } from '@/constants/error';
import { db } from '@/utils/db';
import { sendInviteEmail } from '@/utils/mailer';

// CLUSTOX: hardcoded on purpose. This was built from NEXTAUTH_URL, which the
// server's .env still sets to http://localhost:3333 -- so every invite email
// carried a link only the server itself could open. Nothing else caught it,
// because every other reader of that variable is same-origin.
//
// Set NEXTAUTH_URL to the public domain on the server and this can go back to
// reading it. Note that local invites now also point at production; the token
// is still valid, so swap the host by hand when testing on localhost.
const APP_URL = 'https://middleware.theclustox.com';

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

  const role = req.payload.role as ClustoxRole;
  const orgId = req.payload.org_id ?? null;

  const { id, token, expiresAt } = await createInvite({
    name: req.payload.name,
    email: req.payload.email,
    role,
    orgId,
    createdBy: session.userId
  });

  const inviteUrl = `${APP_URL}/accept-invite?token=${token}`;

  // Adopting an existing workspace is the only case where a name is known
  // up front -- a brand-new one is created (and named) on acceptance, so
  // there's nothing to show yet.
  const org =
    role === 'ADMIN' && orgId
      ? await db(Table.Organization).where('id', orgId).first()
      : null;

  // Best-effort and never fatal: the invite (and its link) already exists
  // regardless of whether the email goes out, so a superadmin can always
  // fall back to copying it manually. See src/utils/mailer.ts.
  const { sent } = await sendInviteEmail({
    to: req.payload.email,
    name: req.payload.name,
    role,
    orgName: org?.name ?? null,
    inviteUrl,
    expiresAt
  });
  if (sent) await markInviteEmailed(id);

  // The raw token is returned exactly once, here. Only its hash is stored, so
  // it cannot be recovered later -- a lost link has to be reissued.
  res.send({
    invite_url: inviteUrl,
    expires_at: expiresAt.toISOString(),
    emailed: sent
  });
});

export default endpoint.serve();
