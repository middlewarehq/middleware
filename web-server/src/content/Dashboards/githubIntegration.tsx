import faker from '@faker-js/faker';
import { GitHub } from '@mui/icons-material';

import GitlabIcon from '@/mocks/icons/gitlab.svg';
import BitbucketIcon from '@/mocks/icons/bitbucket.svg'

export const githubIntegrationsDisplay = {
  id: faker.datatype.uuid(),
  type: 'github',
  name: 'Github',
  description: 'Code insights & blockers',
  color: '#fff',
  bg: `linear-gradient(135deg, hsla(160, 10%, 61%, 0.6) 0%, hsla(247, 0%, 21%, 0.6) 100%)`,
  icon: <GitHub fontSize="large" />
};

export const gitLabIntegrationDisplay = {
  id: '39936e43-178a-4272-bef3-948d770bc98f',
  type: 'gitlab',
  name: 'Gitlab',
  description: 'Code insights & blockers',
  color: '#554488',
  bg: 'linear-gradient(-45deg, hsla(17, 95%, 50%, 0.6) 0%, hsla(42, 94%, 67%, 0.6) 100%)',
  icon: <GitlabIcon height={28} width={28} />
} as IntegrationItem;

export const bitBucketIntegrationDisplay = {
  id: faker.datatype.uuid(),
  type: 'bitbucket',
  name: 'BitBucket',
  description: 'Code insights & blockers',
  color: '#fff',
  bg: `linear-gradient(-45deg, rgba(69, 110, 232, 0.6) 0%, rgba(24, 176, 236, 0.6) 100%)`,
  icon: <BitbucketIcon height={28} width={28} />
} as IntegrationItem;

export type IntegrationItem = typeof githubIntegrationsDisplay;
