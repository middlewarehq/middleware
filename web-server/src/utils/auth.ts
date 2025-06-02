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
  customDomain?: string,
  tokenType: 'classic' | 'fine-grained' = 'classic'
): Promise<boolean> {
  try {
    const baseUrl = customDomain ? `${customDomain}/api/v3` : DEFAULT_GH_URL;
    const authHeader =
     tokenType === 'classic' ? `token ${good_stuff}` : `Bearer ${good_stuff}`;

    await axios.get(`${baseUrl}/user`, {
      headers: {
        Authorization: authHeader
      }
    });
    return true;
  } catch (error) {
    return false;
  }
}

const PAT_SCOPES = ['read:org', 'read:user', 'repo', 'workflow'];
const FINE_GRAINED_SCOPES = [
  'contents:read',
  'metadata:read',
  'pull_requests:read',
  'workflows:read'
];

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

export const getMissingFineGrainedScopes = async (
  token: string,
  customDomain?: string
) => {
  const baseUrl = customDomain ? `${customDomain}/api/v3` : DEFAULT_GH_URL;
  try {
    const response = await axios.get(`${baseUrl}/user`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    // For fine-grained tokens, we need to check the token's permissions
    // This is a simplified check - in reality, you'd want to verify each permission
    // by making specific API calls to test access
    const hasAccess = response.status === 200;
    if (!hasAccess) return FINE_GRAINED_SCOPES;

    // Since fine-grained tokens don't expose scopes in headers like PATs do,
    // we'll need to test each required permission individually
    // This is a placeholder for the actual permission checks
    return [];
  } catch (error) {
    throw new Error('Failed to get missing fine-grained token scopes', error);
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

export const getTokenType = (
  token: string
): 'classic' | 'fine-grained' | 'unknown' => {
  if (token.startsWith('ghp_')) return 'classic';
  if (token.startsWith('github_pat_')) return 'fine-grained';
  return 'unknown';
};