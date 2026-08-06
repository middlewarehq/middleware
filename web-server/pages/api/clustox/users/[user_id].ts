import * as yup from 'yup';

import { Endpoint } from '@/api-helpers/global';
import { assertRole } from '@/auth/guard';
import {
  countSuperadmins,
  setUserTeams,
  setUserWorkspace,
  updateUserRole
} from '@/auth/queries';
import { ClustoxRole } from '@/auth/types';
import { Errors, ResponseError } from '@/constants/error';

const pathSchema = yup.object().shape({
  user_id: yup.string().uuid().required()
});

const patchSchema = yup.object().shape({
  user_id: yup.string().uuid().required(),
  role: yup.string().oneOf(['SUPERADMIN', 'ADMIN']).optional(),
  team_ids: yup.array().of(yup.string().uuid()).optional(),
  // Move an admin into a workspace. Used to adopt a workspace that has no
  // owner, rather than recreating its integration and repositories.
  org_id: yup.string().uuid().nullable().optional()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.PATCH(patchSchema, async (req, res) => {
  const session = assertRole((req as any).session, 'SUPERADMIN');

  // Demoting the last superadmin would leave nobody able to administer the
  // instance, which is unrecoverable through the UI.
  if (req.payload.role === 'ADMIN') {
    const remaining = await countSuperadmins();
    if (remaining <= 1 && session.userId === req.payload.user_id) {
      throw new ResponseError(Errors.ACCESS_DENIED, 409);
    }
  }

  if (req.payload.role) {
    // yup's .oneOf() widens to string; the schema has already validated it.
    const role = req.payload.role as ClustoxRole;
    await updateUserRole(req.payload.user_id, role);

    // A superadmin owns no workspace. Promoting without clearing it would
    // leave a user who both sits above every workspace and owns one, which
    // no part of the model expects.
    if (role === 'SUPERADMIN') {
      await setUserWorkspace(req.payload.user_id, null);
    }
  }

  if (req.payload.org_id !== undefined && req.payload.role !== 'SUPERADMIN') {
    await setUserWorkspace(req.payload.user_id, req.payload.org_id ?? null);
  }

  if (req.payload.team_ids) {
    await setUserTeams(req.payload.user_id, req.payload.team_ids);
  }

  res.send({ ok: true });
});

export default endpoint.serve();
