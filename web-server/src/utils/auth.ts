import axios from 'axios';
import { isNil, reject } from 'ramda';

import { Integration } from '@/constants/integrations';

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
      meta_data: { ...meta, tokenType: meta?.tokenType || 'PAT' }
    })
  );
};

// GitHub functions

export async function checkGitHubValidity(
  good_stuff: string
): Promise<{ isValid: boolean; tokenType: 'PAT' | 'FGT' }> {
  try {
    const response = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `token ${good_stuff}`
      }
    });

    const scopesString = response.headers['x-oauth-scopes'] as string;
    // PATs have scopes in x-oauth-scopes, FGTs do not
    const tokenType = scopesString ? 'PAT' : 'FGT';
    return { isValid: true, tokenType };
  } catch (error) {
    return { isValid: false, tokenType: 'PAT' };
  }
}

const PAT_SCOPES = ['read:org', 'read:user', 'repo', 'workflow'];

export const getMissingTokenScopes = async (
  pat: string,
  tokenType: 'PAT' | 'FGT'
) => {
  if (tokenType === 'FGT') {
    try {
      const response = await axios.get('https://api.github.com/user/repos', {
        headers: {
          Authorization: `token ${pat}`
        },
        params: { per_page: 1 }
      });

      // FGTs don't return scopes in headers, so we infer permissions from API access
      if (!response.data.length) {
        return ['repository_access'];
      }
      return [];
    } catch (error) {
      throw new Error('Failed to verify FGT permissions', error);
    }
  }

  try {
    const response = await axios.get('https://api.github.com', {
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
