import axios from 'axios';

import { Integration } from '@/constants/integrations';

export const unlinkProvider = async (orgId: string, provider: Integration) => {
  return await axios.delete(`/api/resources/orgs/${orgId}/integration`, {
    params: { provider }
  });
};

export const linkProvider = async (
  stuff: string,
  orgId: string,
  provider: Integration
) => {
  return await axios.post(`/api/resources/orgs/${orgId}/integration`, {
    provider,
    the_good_stuff: stuff
  });
};

export async function checkGitHubValidity(
  good_stuff: string
): Promise<boolean> {
  try {
    await axios.get('https://api.github.com/user', {
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
export const getMissingPATScopes = async (pat: string) => {
  try {
    const response = await axios.get('https://api.github.com', {
      headers: {
        Authorization: `token ${pat}`
      }
    });

    const scopesString = response.headers['x-oauth-scopes'];
    if (!scopesString) return PAT_SCOPES;

    const userScopes = scopesString.split(',').map((scope) => scope.trim());
    return PAT_SCOPES.filter((scope) => !userScopes.includes(scope));
  } catch (error) {
    throw new Error('Failed to get missing PAT scopes', error);
  }
};
