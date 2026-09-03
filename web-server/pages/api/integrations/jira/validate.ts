import axios from 'axios';
import * as yup from 'yup';

import { Endpoint, nullSchema } from '@/api-helpers/global';

const postSchema = yup.object().shape({
  site_url: yup.string().required(),
  email: yup.string().email().required(),
  api_token: yup.string().required()
});

// Reduces any of "mycompany.atlassian.net", "https://mycompany.atlassian.net/",
// or a full URL copied from the browser while looking at a board
// ("https://mycompany.atlassian.net/jira/software/projects/ABC/boards/1")
// to just the hostname. A regex that only stripped a leading protocol and
// trailing slash left any path/query intact, which broke the very next
// request below (404s even with a valid site + credentials) for anyone
// who pasted a full address rather than typing the bare domain. Mirrors
// normalizeJiraSiteUrl in src/utils/auth.ts -- kept as two small copies
// rather than a shared import across the client/server boundary, same as
// that file's other provider helpers.
const normalizeSiteUrl = (input: string) => {
  const trimmed = input.trim();
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    return new URL(withProtocol).hostname;
  } catch {
    return trimmed;
  }
};

const endpoint = new Endpoint(nullSchema);

// CLUSTOX: Jira's Cloud REST API does not send permissive CORS headers for
// arbitrary third-party origins doing Basic-auth token requests (unlike
// GitHub/GitLab's APIs, which checkGitHubValidity/checkGitLabValidity call
// directly from the browser). A direct browser fetch to
// https://{site}/rest/api/3/myself fails with a CORS error before the
// request even reaches Jira, regardless of whether the credentials are
// valid. Proxying through our own backend (server-to-server, no CORS)
// sidesteps that -- this route exists only for that reason, and does not
// persist anything; linking still goes through the existing generic
// /api/resources/orgs/[org_id]/integration route unchanged.
endpoint.handle.POST(postSchema, async (req, res) => {
  const { site_url, email, api_token } = req.payload;
  const domain = normalizeSiteUrl(site_url);

  try {
    const response = await axios.get(
      `https://${domain}/rest/api/3/myself`,
      {
        auth: { username: email, password: api_token },
        timeout: 8000
      }
    );

    // CLUSTOX: a 2xx status alone doesn't mean this was actually Jira's
    // /myself endpoint -- e.g. id.atlassian.com (a real Atlassian domain,
    // just not a Jira Cloud *site*) answers this same path with HTTP 202
    // and an HTML body, which axios treats as success. Every genuine
    // Jira /myself response is JSON with an accountId; require that
    // instead of trusting the status code alone, or a wrong-but-plausible
    // domain reports as "linked" without ever having verified anything.
    if (!response.data || typeof response.data !== 'object' || !response.data.accountId) {
      return res.send({ valid: false, reason: 'unknown' });
    }

    return res.send({
      valid: true,
      display_name: response.data.displayName ?? email
    });
  } catch (error: any) {
    const status = error?.response?.status;
    return res.send({
      valid: false,
      // Distinguishes "reached Jira, credentials were wrong" from "that
      // site doesn't exist" from "couldn't reach it at all" -- Atlassian's
      // edge answers a nonexistent *.atlassian.net subdomain with a JSON
      // 404 (not a DNS failure), so a typo'd site shows up as a 404 here,
      // not as the network-level "unreachable" case.
      reason:
        status === 401 || status === 403
          ? 'unauthorized'
          : status === 404 || !error?.response
            ? 'unreachable'
            : 'unknown'
    });
  }
});

export default endpoint.serve();
