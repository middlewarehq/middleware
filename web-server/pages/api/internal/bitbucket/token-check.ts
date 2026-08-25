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
  const headers = {
    Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString(
      'base64'
    )}`
  };

  const response = await fetch('https://api.bitbucket.org/2.0/user', {
    headers
  });

  if (response.ok) {
    const user = await response.json();
    return res.send({ valid: true, nickname: user.nickname ?? null });
  }

  // CLUSTOX: a scoped Atlassian token created without the `account` read
  // scope fails /2.0/user while working fine against repositories -- and the
  // sync's own validity check uses /2.0/user, so such a token must be
  // rejected HERE, with a message that names the actual problem instead of
  // "invalid credentials". Probe /2.0/workspaces to tell the two apart.
  const workspaces = await fetch(
    'https://api.bitbucket.org/2.0/workspaces?pagelen=1',
    { headers }
  );
  if (workspaces.ok) {
    return res.send({ valid: false, reason: 'missing_account_scope' });
  }

  // Neither endpoint accepts the pair: wrong email, wrong token, revoked or
  // expired -- the API cannot tell these apart, so neither can our copy.
  return res.send({ valid: false, reason: 'invalid_credentials' });
});

export default endpoint.serve();
