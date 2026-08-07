import * as yup from 'yup';

import { Endpoint, nullSchema } from '@/api-helpers/global';
import { acceptInvite, previewInvite } from '@/auth/invites';
import { Errors, ResponseError } from '@/constants/error';

const MIN_PASSWORD = 12;

const getSchema = yup.object().shape({
  token: yup.string().required()
});

const postSchema = yup.object().shape({
  token: yup.string().required(),
  password: yup.string().min(MIN_PASSWORD).required()
});

/**
 * Redeeming an invite. Necessarily unauthenticated -- the whole point is that
 * the invitee has no account yet.
 *
 * The token is the only credential, so:
 *  - only its hash is stored, and it is returned to the superadmin once
 *  - unusable tokens are rejected identically whether unknown, spent, revoked
 *    or expired, so a guesser learns nothing from the response
 *  - acceptance marks the invite spent, making the link single-use
 */
const endpoint = new Endpoint(nullSchema, { unauthenticated: true });

endpoint.handle.GET(getSchema, async (req, res) => {
  const preview = await previewInvite(req.payload.token);
  if (!preview) throw new ResponseError(Errors.ACCESS_DENIED, 404);

  // Enough to show who the invite is for, and nothing else.
  res.send(preview);
});

endpoint.handle.POST(postSchema, async (req, res) => {
  const result = await acceptInvite(req.payload.token, req.payload.password);

  if (result.ok === false) {
    throw new ResponseError(
      Errors.ACCESS_DENIED,
      result.reason === 'ALREADY_EXISTS' ? 409 : 404
    );
  }

  res.send({ ok: true, email: result.email });
});

export default endpoint.serve();
