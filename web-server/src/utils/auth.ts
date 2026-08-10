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

// Strip any protocol/trailing slash so "mycompany.atlassian.net" and
// "https://mycompany.atlassian.net/" are stored the same way. Mirrors the
// normalizer in pages/api/integrations/jira/validate.ts -- kept as two
// small copies rather than a shared import across the client/server
// boundary, same as this file's other provider helpers.
export const normalizeJiraSiteUrl = (input: string) =>
  input
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');

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
    return { valid: data.valid, displayName: data.display_name, reason: data.reason };
  } catch (error) {
    return { valid: false, reason: 'unknown' };
  }
};

// Jira API tokens inherit the full permissions of the account they belong
// to -- there's no OAuth-style scope grant to inspect the way there is for
// a GitHub/GitLab PAT, so there's no getMissingJiraScopes equivalent.
