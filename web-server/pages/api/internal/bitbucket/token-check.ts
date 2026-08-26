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

  // CLUSTOX: the try/catch is secret hygiene, not politeness. An uncaught
  // fetch error propagates to the global handler, which logs the whole
  // request -- token included -- into the server log. A network failure here
  // must degrade to a clean "invalid" answer instead.
  let response: Response;
  try {
    response = await fetch('https://api.bitbucket.org/2.0/user', { headers });
  } catch (e) {
    return res.send({ valid: false, reason: 'network_error' });
  }

  if (response.ok) {
    const user = await response.json();
    return res.send({ valid: true, nickname: user.nickname ?? null });
  }

  // CLUSTOX: a scoped token missing the account read scope gets 403 from
  // /2.0/user with otherwise-valid credentials; a wrong pair gets 401. The
  // sync's own validity check uses /2.0/user, so a 403 token must still be
  // rejected -- but with a message naming the actual problem. (An earlier
  // version probed /2.0/workspaces to tell these apart; that endpoint is
  // dead -- 410 CHANGE-2770 -- so the probe made this reason unreachable.)
  if (response.status === 403) {
    return res.send({ valid: false, reason: 'missing_account_scope' });
  }

  // 401 and everything else: wrong email, wrong token, revoked or expired --
  // the API cannot tell these apart, so neither can our copy.
  return res.send({ valid: false, reason: 'invalid_credentials' });
});

export default endpoint.serve();
