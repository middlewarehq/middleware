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
      meta_data: meta
    })
  );
};

// GitHub functions

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

// BitBucket Functions
interface BitBucketValidationResponse {
  headers: Record<string, string>;
  data?: any;
}

interface BitBucketCredentials {
  email: string;
  apiToken: string;
}

export const checkBitBucketValidity = async (
  email: string,
  apiToken: string
): Promise<BitBucketValidationResponse> => {
  if (!email?.trim() || !apiToken?.trim()) {
    throw new Error('Email and API Token are required');
  }

  // Basic email validation
  const trimmedEmail = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    throw new Error('Please enter a valid email address.');
  }

  try {
    const response = await axios.post<BitBucketValidationResponse>(
      '/api/integrations/bitbucket/scopes',
      {
        email: trimmedEmail,
        apiToken: apiToken
      } as BitBucketCredentials,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000 // Increased timeout for better reliability
      }
    );

    // Validate response structure
    if (!response.data || !response.data.headers) {
      throw new Error('Invalid response from BitBucket API');
    }

    return response.data;
  } catch (error: any) {
    if (error.code === 'ECONNABORTED') {
      throw new Error(
        'Request timeout. Please check your internet connection and try again.'
      );
    }

    if (error.response?.status === 401) {
      throw new Error(
        'Invalid email or API Token. Please verify your credentials.'
      );
    }

    if (error.response?.status === 403) {
      throw new Error(
        'Access forbidden. Please ensure your API Token has the required permissions.'
      );
    }

    if (error.response?.status >= 500) {
      throw new Error(
        'Bitbucket service is currently unavailable. Please try again later.'
      );
    }

    const message =
      error.response?.data?.message ||
      error.message ||
      'Unable to validate Bitbucket credentials. Please try again.';
    throw new Error(message);
  }
};

const BITBUCKET_SCOPES = [
  'issue',
  'pullrequest',
  'project',
  'account'
] as const;

export const getMissingBitBucketScopes = (userScopes: string[]): string[] => {
  if (!Array.isArray(userScopes)) {
    return [...BITBUCKET_SCOPES];
  }

  const normalizedUserScopes = userScopes
    .map((scope) => scope.trim().toLowerCase())
    .filter(Boolean);

  return BITBUCKET_SCOPES.filter(
    (requiredScope) =>
      !normalizedUserScopes.includes(requiredScope.toLowerCase())
  );
};
