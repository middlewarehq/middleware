import { Integration } from './integrations';

export const PERSISTED_FLAG_KEY = `application-persisted-feature-flags`;

export const CODE_PROVIDER_INTEGRATIONS_MAP = {
  [Integration.GITHUB]: Integration.GITHUB,
  [Integration.GITLAB]: Integration.GITLAB,
  [Integration.BITBUCKET]: Integration.BITBUCKET
};
