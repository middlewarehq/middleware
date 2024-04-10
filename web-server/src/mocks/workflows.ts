import faker from '@faker-js/faker';

import { CIProvider } from '@/constants/integrations';
import { RepoWorkflow } from '@/types/resources';

import { randInt, staticArray } from '../utils/mock';

export const mockWorkflows: RepoWorkflow[] = staticArray(5).map(() => ({
  id: randInt(1e5, 1e6),
  name: faker.random.words(randInt(1, 4)),
  html_url: faker.internet.url(),
  ci_provider:
    randInt(1, 2) === 1 ? CIProvider.GITHUB_ACTIONS : CIProvider.CIRCLE_CI
}));
