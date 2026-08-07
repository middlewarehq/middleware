import * as yup from 'yup';

import { Endpoint, nullSchema } from '@/api-helpers/global';
import { assertRole } from '@/auth/guard';
import { createUser, getAuthUserByEmail, listUsers } from '@/auth/queries';
import { ClustoxRole } from '@/auth/types';
import { Table } from '@/constants/db';
import { Errors, ResponseError } from '@/constants/error';
import { db } from '@/utils/db';

const postSchema = yup.object().shape({
  name: yup.string().required(),
  email: yup.string().email().required(),
  // Enforced here so the UI cannot create a weak account.
  password: yup.string().min(12).required(),
  role: yup.string().oneOf(['SUPERADMIN', 'ADMIN']).required(),
  team_ids: yup.array().of(yup.string().uuid()).required()
});

const endpoint = new Endpoint(nullSchema);

endpoint.handle.GET(nullSchema, async (req, res) => {
  assertRole((req as any).session, 'SUPERADMIN');
  res.send(await listUsers());
});

endpoint.handle.POST(postSchema, async (req, res) => {
  assertRole((req as any).session, 'SUPERADMIN');

  const existing = await getAuthUserByEmail(req.payload.email);
  if (existing) {
    throw new ResponseError(Errors.INSUFFICIENT_PARAMS, 409);
  }

  const org = await db(Table.Organization).select('id').first();
  if (!org) throw new ResponseError(Errors.USER_NOT_FOUND, 500);

  const userId = await createUser({
    name: req.payload.name,
    email: req.payload.email,
    password: req.payload.password,
    // yup's .oneOf() widens to string; the schema has already validated it.
    role: req.payload.role as ClustoxRole,
    teamIds: req.payload.team_ids,
    orgId: org.id
  });

  res.send({ user_id: userId });
});

export default endpoint.serve();
