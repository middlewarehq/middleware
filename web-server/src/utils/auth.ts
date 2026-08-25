import axios from 'axios';
import { isNil, reject } from 'ramda';

import { Integration } from '@/constants/integrations';
import { DEFAULT_GH_URL } from '@/constants/urls';

export const unlinkProvider = async (orgId: string, provider: Integration) => {
  return await axios.delete(`/api/resources/orgs/${orgId}/integration`, {
    params: { provider }
  });
};

export const linkProvider = async (
  stuff: string,
  orgId: string,
  provider: Integration,
  meta?: Record<string, any>
) => {
  return await axios.post(
    `/api/resources/orgs/${orgId}/integration`,
    reject(isNil, {
      provider,
      the_good_stuff: stuff,
      meta_data: meta
    })
  );
};

// GitHub functions

export async function checkGitHubValidity(
  good_stuff: string,
  customDomain?: string
): Promise<boolean> {
  try {
    // if customDomain is provded, the host will be customDomain/api/v3
    // else it will be api.github.com(default)
    const baseUrl = customDomain ? `${customDomain}/api/v3` : DEFAULT_GH_URL;

    await axios.get(`${baseUrl}/user`, {
      headers: {
        Authorization: `token ${good_stuff}`
      }
    });
    return true;
  } catch (error) {
    return false;
  }
}

const PAT_SCOPES = ['read:org', 'read:user', 'repo', 'workflow'];
export const getMissingPATScopes = async (
  pat: string,
  customDomain?: string
) => {
  const baseUrl = customDomain ? `${customDomain}/api/v3` : DEFAULT_GH_URL;
  try {
    const response = await axios.get(baseUrl, {
      headers: {
        Authorization: `token ${pat}`
      }
    });

    const scopesString = response.headers['x-oauth-scopes'] as string;
    if (!scopesString) return PAT_SCOPES;

    const userScopes = scopesString.split(',').map((scope) => scope.trim());
    return PAT_SCOPES.filter((scope) => !userScopes.includes(scope));
  } catch (error) {
    throw new Error('Failed to get missing PAT scopes', error);
  }
};

// Bitbucket functions

// CLUSTOX: server-side, unlike checkGitHubValidity above --
// api.bitbucket.org sends no CORS headers for Basic auth from foreign
// origins, so a browser-direct check dies in preflight. The internal
// endpoint calls /2.0/user and returns a boolean; the token goes over our
// own wire once and is never logged or echoed.
export const checkBitbucketValidity = async (
  email: string,
  token: string
): Promise<boolean> => {
  try {
    const response = await axios.post('/api/internal/bitbucket/token-check', {
      email,
      token
    });
    return Boolean(response.data?.valid);
  } catch (error) {
    return false;
  }
};

// Gitlab functions

export const checkGitLabValidity = async (
  accessToken: string,
  customDomain?: string
) => {
  const baseUrl = customDomain || 'https://gitlab.com';
  const url = `${baseUrl}/api/v4/personal_access_tokens/self`;
  try {
    const response = await axios.get(url, {
      headers: {
        'PRIVATE-TOKEN': accessToken
      }
    });
    return response.data;
  } catch (error) {
    throw new Error('Invalid access token', error);
  }
};

const GITLAB_SCOPES = ['api', 'read_api', 'read_user'];

export const getMissingGitLabScopes = (scopes: string[]): string[] => {
  const missingScopes = GITLAB_SCOPES.filter(
    (scope) => !scopes.includes(scope)
  );
  return missingScopes;
};

// Jira functions

// Reduces any of "mycompany.atlassian.net", "https://mycompany.atlassian.net/",
// or a full URL copied from the browser while looking at a board
// ("https://mycompany.atlassian.net/jira/software/projects/ABC/boards/1")
// to just the hostname. A regex that only stripped a leading protocol and
// trailing slash left any path/query intact, which broke the very next
// request (GET https://{that}/rest/api/3/myself 404s) for anyone who
// pasted a full address rather than typing the bare domain. Mirrors the
// normalizer in pages/api/integrations/jira/validate.ts -- kept as two
// small copies rather than a shared import across the client/server
// boundary, same as this file's other provider helpers.
export const normalizeJiraSiteUrl = (input: string) => {
  const trimmed = input.trim();
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    return new URL(withProtocol).hostname;
  } catch {
    // Not parseable as a URL at all (e.g. empty string) -- fall through to
    // the caller's own "fill in all three fields"/validity check rather
    // than throw here.
    return trimmed;
  }
};

export type JiraValidityResult = {
  valid: boolean;
  displayName?: string;
  reason?: 'unauthorized' | 'unreachable' | 'unknown';
};

// CLUSTOX: unlike checkGitHubValidity/checkGitLabValidity, this cannot call
// Jira's API directly from the browser -- Jira Cloud doesn't send CORS
// headers permissive enough for a third-party origin's Basic-auth request,
// so it's proxied through our own backend instead (see
// pages/api/integrations/jira/validate.ts for why).
export const checkJiraValidity = async (
  siteUrl: string,
  email: string,
  apiToken: string
): Promise<JiraValidityResult> => {
  try {
    const { data } = await axios.post('/api/integrations/jira/validate', {
      site_url: siteUrl,
      email,
      api_token: apiToken
    });
    return {
      valid: data.valid,
      displayName: data.display_name,
      reason: data.reason
    };
  } catch (error) {
    return { valid: false, reason: 'unknown' };
  }
};

// Jira API tokens inherit the full permissions of the account they belong
// to -- there's no OAuth-style scope grant to inspect the way there is for
// a GitHub/GitLab PAT, so there's no getMissingJiraScopes equivalent.
