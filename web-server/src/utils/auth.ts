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
): Promise<string[]> => {
  const baseUrl = customDomain ? `${customDomain}/api/v3` : DEFAULT_GH_URL;
  const headers = { Authorization: `Bearer ${token}` };

  try {
    const [userResponse, reposResponse] = await Promise.all([
      axios.get(`${baseUrl}/user`, { headers }),
      axios.get(`${baseUrl}/user/repos?per_page=1`, { headers })
    ]);

    const owner = userResponse.data.login;
    const repo = reposResponse.data[0]?.name;
    if (!repo) {
      throw new Error('No repositories found');
    }

    const permissionTests = [
      {
        scope: 'pull_requests:read',
        endpoint: `/repos/${owner}/${repo}/pulls?per_page=1`
      },
      {
        scope: 'workflows:read',
        endpoint: `/repos/${owner}/${repo}/actions/runs?per_page=1`
      }
    ];

    const missingScopes = await Promise.all(
      permissionTests.map(async ({ scope, endpoint }) => {
        try {
          await axios.get(`${baseUrl}${endpoint}`, { headers });
          return null;
        } catch (error: unknown) {
          const err = error as { response?: { status?: number } };
          return err.response?.status === 403 ? scope : null;
        }
      })
    );

    return missingScopes.filter(Boolean) as string[];
  } catch (error: unknown) {
    const err = error as { response?: { status?: number } };
    if (err.response?.status === 403) {
      return ['metadata:read', 'contents:read'];
    }
    console.warn('Error verifying token scopes', error);
    return FINE_GRAINED_SCOPES;
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
