import * as yup from 'yup';

import { Endpoint, nullSchema } from '@/api-helpers/global';

const postSchema = yup.object().shape({
  email: yup.string().email().required(),
  token: yup.string().required()
});

const endpoint = new Endpoint(nullSchema);

// CLUSTOX: GitHub's modal validates its PAT straight from the browser;
// Bitbucket cannot -- api.bitbucket.org sends no CORS headers for Basic auth
// from foreign origins, so the preflight dies before any request. The check
// runs here instead. GitLab's modal already validates server-side, so this is
// the established pattern, not a new one.
//
// The token passes through this handler and is never logged, never persisted
// here, and never echoed in a response -- the reply carries a boolean and the
// account nickname only. Linking (and encryption) stays with the existing
// /api/resources/orgs/<id>/integration flow.
endpoint.handle.POST(postSchema, async (req, res) => {
  const { email, token } = req.payload;

  const response = await fetch('https://api.bitbucket.org/2.0/user', {
    headers: {
      Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString(
        'base64'
      )}`
    }
  });

  if (!response.ok) {
    // 401 and 403 both mean unusable credentials; the API cannot tell a
    // revoked token from an expired one, so neither can our copy.
    return res.send({ valid: false });
  }

  const user = await response.json();
  return res.send({ valid: true, nickname: user.nickname ?? null });
});

export default endpoint.serve();
