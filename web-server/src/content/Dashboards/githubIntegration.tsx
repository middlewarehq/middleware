import faker from '@faker-js/faker';
import { GitHub } from '@mui/icons-material';

import BitbucketIcon from '@/mocks/icons/bitbucket.svg';
import GitlabIcon from '@/mocks/icons/gitlab.svg';
import JiraIcon from '@/mocks/icons/jira-icon.svg';

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

export const bitbucketIntegrationDisplay = {
  id: '5b3f7e1a-92c4-4d6e-8f0a-1c9d2e3f4a5b',
  type: 'bitbucket',
  name: 'Bitbucket',
  description: 'Code insights & blockers',
  color: '#2684FF',
  bg: 'linear-gradient(135deg, hsla(214, 90%, 52%, 0.6) 0%, hsla(221, 83%, 33%, 0.6) 100%)',
  icon: <BitbucketIcon height={26} width={26} />
} as IntegrationItem;

// CLUSTOX: Jira -- a project-tracker integration, not a code provider (see
// docs/JIRA_INTEGRATION_PROPOSAL.md). Phase 1 only links and stores the
// token; ticket sync and PR correlation are later phases.
export const jiraIntegrationDisplay = {
  id: '8f0a3f2e-2f1d-4b1a-9b6b-6a2b8f6e9c4d',
  type: 'jira',
  name: 'Jira',
  description: 'Ticket-linked cycle time',
  color: '#2684FF',
  bg: 'linear-gradient(135deg, hsla(212, 96%, 55%, 0.6) 0%, hsla(217, 100%, 40%, 0.6) 100%)',
  icon: <JiraIcon height={26} width={26} />
} as IntegrationItem;

export type IntegrationItem = typeof githubIntegrationsDisplay;
