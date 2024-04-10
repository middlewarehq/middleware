import faker from '@faker-js/faker';

import { cockpitV2MockData } from '@/mocks/cockpit';
import { RepoWithSingleWorkflow } from '@/types/resources';

export const mockDoraMetrics = {
  cycle_time_stats: cockpitV2MockData.cycle_time_stats,
  lead_time_stats: cockpitV2MockData.lead_time_stats,
  cycle_time_trends: cockpitV2MockData.cycle_time_trends,
  lead_time_trends: cockpitV2MockData.lead_time_trends,
  mean_time_to_restore_stats: cockpitV2MockData.mean_time_to_restore_stats,
  mean_time_to_restore_trends: cockpitV2MockData.mean_time_to_restore_trends,
  change_failure_rate_stats: cockpitV2MockData.change_failure_rate_stats,
  change_failure_rate_trends: cockpitV2MockData.change_failure_rate_trends,
  deployment_frequency_stats: cockpitV2MockData.deployment_frequency_stats,
  deployment_frequency_trends: cockpitV2MockData.deployment_frequency_trends,
  allReposAssignedToTeam: [
    {
      id: 'fa2d219b-c644-40e7-86ef-c976b40f2d23',
      org_id: 'd4688672-984d-4521-8a0e-b95a18059aa6',
      name: 'monorepo',
      org_name: 'monoclehq',
      provider: 'github',
      is_active: true,
      default_branch: 'master',
      language: 'Python',
      contributors: {
        contributions: []
      },
      idempotency_key: '458772068',
      slug: 'monorepo',
      created_at: new Date('2023-01-23T07:00:43.105022+00:00'),
      updated_at: new Date('2023-07-21T02:40:27.125623+00:00'),
      repo_workflow: null
    },
    {
      id: 'fa2d219b-c644-40e7-86ef-c976b40f2d23',
      org_id: 'd4688672-984d-4521-8a0e-b95a18059aa6',
      name: 'monorepo',
      org_name: 'monoclehq',
      provider: 'github',
      is_active: true,
      default_branch: 'master',
      language: 'Python',
      contributors: {
        contributions: []
      },
      idempotency_key: '458772068',
      slug: 'monorepo',
      created_at: new Date('2023-01-23T07:00:43.105022+00:00'),
      updated_at: new Date('2023-07-21T02:40:27.125623+00:00'),
      repo_workflow: null
    }
  ].map(
    (repo) =>
      ({
        ...repo,
        name: faker.lorem.slug(),
        slug: faker.lorem.slug(),
        org_name: faker.lorem.word()
      }) as RepoWithSingleWorkflow
  ),
  workflowConfiguredRepos: [
    {
      id: 'fa2d219b-c644-40e7-86ef-c976b40f2d23',
      org_id: 'd4688672-984d-4521-8a0e-b95a18059aa6',
      name: 'monorepo',
      org_name: 'monoclehq',
      provider: 'github',
      is_active: true,
      default_branch: 'master',
      language: 'Python',
      contributors: {
        contributions: []
      },
      idempotency_key: '458772068',
      slug: 'monorepo',
      created_at: new Date('2023-01-23T07:00:43.105022+00:00'),
      updated_at: new Date('2023-07-21T02:40:27.125623+00:00'),
      repo_workflow: null
    },
    {
      id: 'fa2d219b-c644-40e7-86ef-c976b40f2d23',
      org_id: 'd4688672-984d-4521-8a0e-b95a18059aa6',
      name: 'monorepo',
      org_name: 'monoclehq',
      provider: 'github',
      is_active: true,
      default_branch: 'master',
      language: 'Python',
      contributors: {
        contributions: []
      },
      idempotency_key: '458772068',
      slug: 'monorepo',
      created_at: new Date('2023-01-23T07:00:43.105022+00:00'),
      updated_at: new Date('2023-07-21T02:40:27.125623+00:00'),
      repo_workflow: null
    }
  ].map(
    (repo) =>
      ({
        ...repo,
        name: faker.lorem.slug(),
        slug: faker.lorem.slug(),
        org_name: faker.lorem.word()
      }) as RepoWithSingleWorkflow
  ),
  deploymentsConfiguredForAllRepos: true,
  deploymentsConfigured: true
};
