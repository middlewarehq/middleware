import faker from '@faker-js/faker';
import { secondsInHour } from 'date-fns/constants';
import { mapObjIndexed, sum } from 'ramda';

import { PullRequestResponse, PR } from '@/types/resources';
import { randInt, staticArray, flexibleArray } from '@/utils/mock';

export const requestsGraphMock = {};

export const prUserStatsMocks = {
  MayankVir: {
    OPEN: 5,
    CLOSED: 2,
    MERGED: 5,
    REVIEWED: 4
  },
  dhruvagarwal: {
    OPEN: 9,
    CLOSED: 0,
    MERGED: 7,
    REVIEWED: 4
  },
  jayantbh: {
    OPEN: 6,
    CLOSED: 2,
    MERGED: 6,
    REVIEWED: 6
  }
};

type MockPROverride = { override: Partial<PR> };

const PRTitles = [
  'Implement basic pull requests screen',
  'Build basic experts UI',
  'Improve Team Hierarchy UI and API integration',
  'Introduce internal APIs',
  'Implement first iteration of teams apis',
  'Store linked accounts tokens in supabase',
  'Functional integrations UI using firebase auth.',
  'Switch to firebase auth from supabase auth',
  'Remove echo file'
];

const authorUsernames = ['jayantbh', 'dhruvagarwal', 'akshaykmr'];

const repoNames = ['web-manager-dash', 'monorepo', 'infra-platform'];

const branchNames = [
  'pulls',
  'team-card-edit',
  'internal-apis',
  'teams-schema-1',
  'auth-identity',
  'tokens-store',
  'integrations-initial'
];

const randAuthor = () => ({
  username: faker.random.arrayElement(authorUsernames),
  linked_user: {
    id: faker.datatype.uuid(),
    name: faker.random.arrayElement(authorUsernames)
  }
});

const getCycleTime = () => ({
  first_response_time: randInt(110, 20) * secondsInHour,
  rework_time: randInt(50, 10) * secondsInHour,
  merge_time: randInt(20, 5) * secondsInHour
});

const mockPullRequest = (
  { override }: MockPROverride = { override: {} }
): PR => {
  const number = randInt(100, 10).toString();
  const cycle = getCycleTime();

  return {
    id: faker.datatype.uuid(),
    number,
    title: '',
    state: 'MERGED',
    ...cycle,
    cycle_time: sum(Object.values(cycle)),
    author: randAuthor(),
    reviewers: flexibleArray(2).map(randAuthor),
    repo_name: faker.random.arrayElement(repoNames),
    pr_link: `https://github.com/monoclehq/web-manager-dash/pull/${number}`,
    base_branch: 'main',
    head_branch: faker.random.arrayElement(branchNames),
    created_at: new Date(faker.date.recent(7)).toISOString(),
    updated_at: new Date(faker.date.recent(3)).toISOString(),
    state_changed_at: new Date(faker.date.recent(3)).toISOString(),
    commits: randInt(10, 2),
    additions: randInt(1100, 50),
    deletions: randInt(500, 50),
    changed_files: randInt(10, 2),
    comments: randInt(10),
    rework_cycles: randInt(4),
    provider: 'github',
    ...override
  };
};

const mockAuthor = {
  username: 'jayantbh',
  linked_user: {
    id: faker.datatype.uuid(),
    name: 'Jayant Bhawal'
  }
};

const longPR = (() => {
  let pr = mockPullRequest();
  const cycle = mapObjIndexed((val) => val * 4, getCycleTime());

  pr = {
    ...pr,
    ...cycle,
    cycle_time: sum(Object.values(cycle)),
    title: 'Implement Amazon Pay integration'
  };

  return pr;
})();

export const mockTeamPullRequests: PullRequestResponse = {
  data: [
    longPR,
    ...staticArray(9).map((i) => {
      let pr = mockPullRequest({ override: { title: PRTitles[i] } });
      const cycle = mapObjIndexed((val) => val * 1.6, getCycleTime());

      pr = {
        ...pr,
        ...cycle,
        cycle_time: sum(Object.values(cycle))
      };

      return pr;
    })
  ],
  page: 1,
  total_count: 9,
  page_size: 100
};

export const mockReviewedPullRequests: PullRequestResponse = {
  data: staticArray(9).map((i) =>
    mockPullRequest({ override: { title: PRTitles[i] } })
  ),
  page: 1,
  total_count: 9,
  page_size: 100
};

export const mockAuthoredPullRequests: PullRequestResponse = {
  data: staticArray(7).map((i) =>
    mockPullRequest({
      override: {
        author: mockAuthor,
        reviewers: flexibleArray(2).map(randAuthor),
        title: PRTitles[i]
      }
    })
  ),
  page: 1,
  total_count: 9,
  page_size: 100
};

export const mockPullRequests: PullRequestResponse =
  // https://zsmtss9xmj.execute-api.ap-south-1.amazonaws.com/api/users/549c49d1-a275-42c4-910f-e23826b6e196/authored_prs?from_time=2022-03-06T13:19:58.177722%2b00:00&to_time=2022-05-09T17:19:58.177722%2b00:00&per_page=9&page=1&base_branches=main

  {
    data: [
      {
        id: '82349e85-917c-4911-acd6-42f984093c7b',
        number: '20',
        title: 'Implement basic pull requests screen',
        state: 'MERGED',
        first_response_time: null,
        rework_time: 0,
        merge_time: null,
        cycle_time: 1260,
        author: mockAuthor,
        reviewers: flexibleArray(2).map(randAuthor),
        repo_name: 'web-manager-dash',
        pr_link: 'https://github.com/monoclehq/web-manager-dash/pull/20',
        base_branch: 'main',
        head_branch: 'pulls',
        created_at: '2022-04-07T22:43:47+00:00',
        updated_at: '2022-04-07T23:04:50+00:00',
        state_changed_at: '2022-04-07T23:04:50+00:00',
        commits: 3,
        additions: 355,
        deletions: 250,
        changed_files: 3,
        comments: randInt(10),
        provider: 'github'
      },
      {
        id: '5fc2be27-7772-4ace-bec7-cfa49506119e',
        number: '19',
        title: 'Implement Team Hierarchy UI and API integration',
        state: 'MERGED',
        first_response_time: null,
        rework_time: 0,
        merge_time: null,
        cycle_time: 573,
        author: mockAuthor,
        reviewers: flexibleArray(2).map(randAuthor),
        repo_name: 'web-manager-dash',
        pr_link: 'https://github.com/monoclehq/web-manager-dash/pull/19',
        base_branch: 'main',
        head_branch: 'team-card-edit',
        created_at: '2022-04-07T14:42:36+00:00',
        updated_at: '2022-06-10T07:37:44+00:00',
        state_changed_at: '2022-06-10T07:37:44+00:00',
        commits: 14,
        additions: 1020,
        deletions: 213,
        changed_files: 14,
        comments: randInt(10),
        provider: 'github'
      },
      {
        id: 'f5e0797f-560c-41a5-af23-5b830604e90a',
        number: '18',
        title: 'Introduce internal APIs',
        state: 'MERGED',
        first_response_time: null,
        rework_time: 0,
        merge_time: null,
        cycle_time: 2640,
        author: mockAuthor,
        reviewers: flexibleArray(2).map(randAuthor),
        repo_name: 'web-manager-dash',
        pr_link: 'https://github.com/monoclehq/web-manager-dash/pull/18',
        base_branch: 'main',
        head_branch: 'internal-apis',
        created_at: '2022-04-07T13:58:53+00:00',
        updated_at: '2022-04-07T14:42:56+00:00',
        state_changed_at: '2022-04-07T14:42:56+00:00',
        commits: 2,
        additions: 169,
        deletions: 45,
        changed_files: 2,
        comments: randInt(10),
        provider: 'github'
      },
      {
        id: 'f8d7a360-1bb8-4d67-9776-0f4f9090c295',
        number: '17',
        title: 'Implement first iteration of teams apis',
        state: 'MERGED',
        first_response_time: null,
        rework_time: 0,
        merge_time: null,
        cycle_time: 343,
        author: mockAuthor,
        reviewers: flexibleArray(2).map(randAuthor),
        repo_name: 'web-manager-dash',
        pr_link: 'https://github.com/monoclehq/web-manager-dash/pull/17',
        base_branch: 'main',
        head_branch: 'teams-schema-1',
        created_at: '2022-04-05T16:14:11+00:00',
        updated_at: '2022-04-05T16:25:15+00:00',
        state_changed_at: '2022-04-05T16:25:15+00:00',
        commits: 1,
        additions: 194,
        deletions: 1483,
        changed_files: 1,
        comments: randInt(10),
        provider: 'github'
      },
      {
        id: 'a65ab654-83b7-4aae-b6c4-b6fe94aa7813',
        number: '16',
        title:
          'Store org_id in UserIdentity table, and if Github link fails, ensure to unlink gh',
        state: 'MERGED',
        first_response_time: null,
        rework_time: 0,
        merge_time: null,
        cycle_time: 598,
        author: mockAuthor,
        reviewers: flexibleArray(2).map(randAuthor),
        repo_name: 'web-manager-dash',
        pr_link: 'https://github.com/monoclehq/web-manager-dash/pull/16',
        base_branch: 'main',
        head_branch: 'auth-identity',
        created_at: '2022-04-05T13:11:02+00:00',
        updated_at: '2022-04-05T13:21:02+00:00',
        state_changed_at: '2022-04-05T13:21:02+00:00',
        commits: 1,
        additions: 27,
        deletions: 17,
        changed_files: 1,
        comments: randInt(10),
        provider: 'github'
      },
      {
        id: '6a767119-ad76-4450-9dc5-67cfb5c80b56',
        number: '15',
        title: 'Store linked accounts tokens in supabase',
        state: 'MERGED',
        first_response_time: null,
        rework_time: 0,
        merge_time: null,
        cycle_time: 156,
        author: mockAuthor,
        reviewers: flexibleArray(2).map(randAuthor),
        repo_name: 'web-manager-dash',
        pr_link: 'https://github.com/monoclehq/web-manager-dash/pull/15',
        base_branch: 'main',
        head_branch: 'tokens-store',
        created_at: '2022-04-04T22:34:53+00:00',
        updated_at: '2022-04-04T22:37:32+00:00',
        state_changed_at: '2022-04-04T22:37:32+00:00',
        commits: 1,
        additions: 198,
        deletions: 36,
        changed_files: 1,
        comments: randInt(10),
        provider: 'github'
      },
      {
        id: '47107d4d-5740-44cf-86b3-001c8c2b09d5',
        number: '13',
        title: 'Functional integrations UI using firebase auth.',
        state: 'MERGED',
        first_response_time: null,
        rework_time: 0,
        merge_time: null,
        cycle_time: 538,
        author: mockAuthor,
        reviewers: flexibleArray(2).map(randAuthor),
        repo_name: 'web-manager-dash',
        pr_link: 'https://github.com/monoclehq/web-manager-dash/pull/13',
        base_branch: 'main',
        head_branch: 'integrations-initial',
        created_at: '2022-04-03T22:35:32+00:00',
        updated_at: '2022-04-03T22:44:32+00:00',
        state_changed_at: '2022-04-03T22:44:32+00:00',
        commits: 2,
        additions: 160,
        deletions: 61,
        changed_files: 2,
        comments: randInt(10),
        provider: 'github'
      },
      {
        id: '0617ceec-3d1d-4757-8a24-800768491e80',
        number: '12',
        title: 'Switch to firebase auth from supabase auth',
        state: 'MERGED',
        first_response_time: null,
        rework_time: 0,
        merge_time: null,
        cycle_time: 942,
        author: mockAuthor,
        reviewers: flexibleArray(2).map(randAuthor),
        repo_name: 'web-manager-dash',
        pr_link: 'https://github.com/monoclehq/web-manager-dash/pull/12',
        base_branch: 'main',
        head_branch: 'firebase-auth',
        created_at: '2022-04-03T21:15:21+00:00',
        updated_at: '2022-04-03T21:34:20+00:00',
        state_changed_at: '2022-04-03T21:34:20+00:00',
        commits: 2,
        additions: 458,
        deletions: 332,
        changed_files: 2,
        comments: randInt(10),
        provider: 'github'
      },
      {
        id: '6844615d-2da9-43a2-b296-2a76fcbd510e',
        number: '11',
        title: 'Remove echo file',
        state: 'MERGED',
        first_response_time: null,
        rework_time: 0,
        merge_time: null,
        cycle_time: 19,
        author: mockAuthor,
        reviewers: flexibleArray(2).map(randAuthor),
        repo_name: 'web-manager-dash',
        pr_link: 'https://github.com/monoclehq/web-manager-dash/pull/11',
        base_branch: 'main',
        head_branch: 'cleanup',
        created_at: '2022-04-03T12:26:59+00:00',
        updated_at: '2022-04-03T12:37:36+00:00',
        state_changed_at: '2022-04-03T12:37:36+00:00',
        commits: 1,
        additions: 0,
        deletions: 30,
        changed_files: 1,
        comments: randInt(10),
        provider: 'github'
      }
    ].map((pr) => ({ ...pr, rework_cycles: randInt(0, 4) }) as PR),
    page: 1,
    total_count: 18,
    page_size: 100
  };

export const generateWeekWiseTimeSeries = (
  count: number,
  yrange: { max: number; min: number }
) => {
  var i = 0;
  var series = [];
  while (i < count) {
    var y =
      Math.floor(Math.random() * (yrange.max - yrange.min + 1)) + yrange.min;
    series.push(y);
    i++;
  }

  return series;
};

export const revertPrsMock = [
  {
    id: 'da6b1d35-f7ce-4ef3-bf75-9f911ffb483c',
    number: '938',
    title: 'Revert "pre-commit hooks setup "',
    state: 'MERGED',
    author: {
      username: 'amoghjalan',
      linked_user: {
        id: '97fb2060-9af2-4f4a-853b-ee1105f00b65',
        name: 'Amogh Jalan'
      }
    },
    reviewers: [
      {
        username: 'samad-yar-khan',
        linked_user: {
          id: '391420ef-b113-4267-8c08-76c0f5140413',
          name: 'Samad Yar Khan'
        }
      }
    ],
    pr_link: 'https://github.com/monoclehq/monorepo/pull/938',
    base_branch: 'master',
    head_branch: 'revert-936-enhancements/pre-commit-setup',
    created_at: '2023-09-05T05:41:17+00:00',
    updated_at: '2023-09-05T05:41:51+00:00',
    state_changed_at: '2023-09-05T05:41:50+00:00',
    commits: 2,
    additions: 0,
    deletions: 10,
    changed_files: 3,
    comments: 1,
    provider: 'github',
    first_commit_to_open: 4,
    first_response_time: 24,
    rework_time: 0,
    merge_time: 9,
    merge_to_deploy: 5101,
    cycle_time: 33,
    rework_cycles: 0,
    repo_name: 'monorepo',
    original_reverted_pr: {
      id: '2ff45d12-f182-45b5-b6e1-016d238f432d',
      number: '936',
      title: 'pre-commit hooks setup ',
      state: 'MERGED',
      author: {
        username: 'adnanhashmi09',
        linked_user: null
      },
      reviewers: [
        {
          username: 'amoghjalan',
          linked_user: {
            id: '97fb2060-9af2-4f4a-853b-ee1105f00b65',
            name: 'Amogh Jalan'
          }
        }
      ],
      pr_link: 'https://github.com/monoclehq/monorepo/pull/936',
      base_branch: 'master',
      head_branch: 'enhancements/pre-commit-setup',
      created_at: '2023-09-05T03:42:53+00:00',
      updated_at: '2023-09-05T06:26:36+00:00',
      state_changed_at: '2023-09-05T04:27:24+00:00',
      commits: 2,
      additions: 10,
      deletions: 0,
      changed_files: 3,
      comments: 1,
      provider: 'github',
      first_commit_to_open: 1357,
      first_response_time: 2305,
      rework_time: 0,
      merge_time: 366,
      merge_to_deploy: 9567,
      cycle_time: 2671,
      rework_cycles: 0,
      repo_name: 'monorepo'
    }
  },
  {
    id: '9d5b06c7-81dc-4b59-a14f-4bfedcc41dc3',
    number: '1115',
    title: 'Revert "Pushback mtd broker bookmark if backdated prs are found"',
    state: 'MERGED',
    author: {
      username: 'dhruvagarwal',
      linked_user: {
        id: '420489b1-9346-4cdc-86fa-23c0032a7ead',
        name: 'Dhruv Agarwal'
      }
    },
    reviewers: [
      {
        username: 'amoghjalan',
        linked_user: {
          id: '97fb2060-9af2-4f4a-853b-ee1105f00b65',
          name: 'Amogh Jalan'
        }
      }
    ],
    pr_link: 'https://github.com/monoclehq/monorepo/pull/1115',
    base_branch: 'master',
    head_branch: 'revert-1114-add-reset-on-pr-update',
    created_at: '2023-10-08T17:52:00+00:00',
    updated_at: '2023-10-08T17:52:45+00:00',
    state_changed_at: '2023-10-08T17:52:44+00:00',
    commits: 1,
    additions: 5,
    deletions: 58,
    changed_files: 6,
    comments: 1,
    provider: 'github',
    first_commit_to_open: 3,
    first_response_time: 16,
    rework_time: 0,
    merge_time: 28,
    merge_to_deploy: 11037,
    cycle_time: 44,
    rework_cycles: 0,
    repo_name: 'monorepo',
    original_reverted_pr: {
      id: '4157f8dd-3795-40ce-95ce-ea475e22ca53',
      number: '1114',
      title: 'Pushback mtd broker bookmark if backdated prs are found',
      state: 'MERGED',
      author: {
        username: 'dhruvagarwal',
        linked_user: {
          id: '420489b1-9346-4cdc-86fa-23c0032a7ead',
          name: 'Dhruv Agarwal'
        }
      },
      reviewers: [
        {
          username: 'amoghjalan',
          linked_user: {
            id: '97fb2060-9af2-4f4a-853b-ee1105f00b65',
            name: 'Amogh Jalan'
          }
        }
      ],
      pr_link: 'https://github.com/monoclehq/monorepo/pull/1114',
      base_branch: 'master',
      head_branch: 'add-reset-on-pr-update',
      created_at: '2023-10-08T17:28:51+00:00',
      updated_at: '2023-10-08T17:46:57+00:00',
      state_changed_at: '2023-10-08T17:46:56+00:00',
      commits: 2,
      additions: 58,
      deletions: 5,
      changed_files: 6,
      comments: 1,
      provider: 'github',
      first_commit_to_open: 53,
      first_response_time: 431,
      rework_time: 0,
      merge_time: 654,
      merge_to_deploy: 11385,
      cycle_time: 1085,
      rework_cycles: 0,
      repo_name: 'monorepo'
    }
  },
  {
    id: 'd45a26bc-2dc1-41c6-b8f9-e87f79c64a94',
    number: '1224',
    title: 'WIP',
    state: 'CLOSED',
    author: {
      username: 'samad-yar-khan',
      linked_user: {
        id: '391420ef-b113-4267-8c08-76c0f5140413',
        name: 'Samad Yar Khan'
      }
    },
    reviewers: [],
    pr_link: 'https://github.com/monoclehq/monorepo/pull/1224',
    base_branch: 'master',
    head_branch: 'revert-1204-remove-migration-0gbg',
    created_at: '2023-11-01T12:58:44+00:00',
    updated_at: '2023-11-01T13:12:38+00:00',
    state_changed_at: '2023-11-01T13:12:38+00:00',
    commits: 2,
    additions: 154,
    deletions: 0,
    changed_files: 3,
    comments: 0,
    provider: 'github',
    first_commit_to_open: null,
    first_response_time: null,
    rework_time: null,
    merge_time: null,
    merge_to_deploy: null,
    cycle_time: null,
    rework_cycles: 0,
    repo_name: 'monorepo',
    original_reverted_pr: {
      id: '470bb9e1-5e5d-4b23-aaeb-e6492de66a70',
      number: '1204',
      title: 'Remove all logic related to RepoWorkflowRuns.duration migration',
      state: 'MERGED',
      author: {
        username: 'samad-yar-khan',
        linked_user: {
          id: '391420ef-b113-4267-8c08-76c0f5140413',
          name: 'Samad Yar Khan'
        }
      },
      reviewers: [
        {
          username: 'jayantbh',
          linked_user: {
            id: '5b874fac-a4cf-4290-b07d-d79915102879',
            name: 'Jayant Bhawal'
          }
        }
      ],
      pr_link: 'https://github.com/monoclehq/monorepo/pull/1204',
      base_branch: 'master',
      head_branch: 'remove-migration-0gbg',
      created_at: '2023-10-31T13:31:27+00:00',
      updated_at: '2023-10-31T15:04:05+00:00',
      state_changed_at: '2023-10-31T15:04:04+00:00',
      commits: 1,
      additions: 0,
      deletions: 171,
      changed_files: 4,
      comments: 1,
      provider: 'github',
      first_commit_to_open: -4659,
      first_response_time: 4924,
      rework_time: 0,
      merge_time: 633,
      merge_to_deploy: 14,
      cycle_time: 5557,
      rework_cycles: 0,
      repo_name: 'monorepo'
    }
  },
  {
    id: 'cef79b35-125a-4d52-9897-9d121e8fdd5b',
    number: '1220',
    title: 'html url migration',
    state: 'MERGED',
    author: {
      username: 'samad-yar-khan',
      linked_user: {
        id: '391420ef-b113-4267-8c08-76c0f5140413',
        name: 'Samad Yar Khan'
      }
    },
    reviewers: [
      {
        username: 'amoghjalan',
        linked_user: {
          id: '97fb2060-9af2-4f4a-853b-ee1105f00b65',
          name: 'Amogh Jalan'
        }
      }
    ],
    pr_link: 'https://github.com/monoclehq/monorepo/pull/1220',
    base_branch: 'master',
    head_branch: 'revert-1204-remove-migration-0gbg',
    created_at: '2023-11-01T11:31:31+00:00',
    updated_at: '2023-11-01T11:37:03+00:00',
    state_changed_at: '2023-11-01T11:37:02+00:00',
    commits: 1,
    additions: 171,
    deletions: 0,
    changed_files: 4,
    comments: 1,
    provider: 'github',
    first_commit_to_open: 19,
    first_response_time: 271,
    rework_time: 0,
    merge_time: 60,
    merge_to_deploy: 23186,
    cycle_time: 331,
    rework_cycles: 0,
    repo_name: 'monorepo',
    original_reverted_pr: {
      id: '470bb9e1-5e5d-4b23-aaeb-e6492de66a70',
      number: '1204',
      title: 'Remove all logic related to RepoWorkflowRuns.duration migration',
      state: 'MERGED',
      author: {
        username: 'samad-yar-khan',
        linked_user: {
          id: '391420ef-b113-4267-8c08-76c0f5140413',
          name: 'Samad Yar Khan'
        }
      },
      reviewers: [
        {
          username: 'jayantbh',
          linked_user: {
            id: '5b874fac-a4cf-4290-b07d-d79915102879',
            name: 'Jayant Bhawal'
          }
        }
      ],
      pr_link: 'https://github.com/monoclehq/monorepo/pull/1204',
      base_branch: 'master',
      head_branch: 'remove-migration-0gbg',
      created_at: '2023-10-31T13:31:27+00:00',
      updated_at: '2023-10-31T15:04:05+00:00',
      state_changed_at: '2023-10-31T15:04:04+00:00',
      commits: 1,
      additions: 0,
      deletions: 171,
      changed_files: 4,
      comments: 1,
      provider: 'github',
      first_commit_to_open: -4659,
      first_response_time: 4924,
      rework_time: 0,
      merge_time: 633,
      merge_to_deploy: 14,
      cycle_time: 5557,
      rework_cycles: 0,
      repo_name: 'monorepo'
    }
  },
  {
    id: '665722a2-856e-4778-ba32-9ae59b23d555',
    number: '1214',
    title: 'Revert "hot_fix"',
    state: 'MERGED',
    author: {
      username: 'samad-yar-khan',
      linked_user: {
        id: '391420ef-b113-4267-8c08-76c0f5140413',
        name: 'Samad Yar Khan'
      }
    },
    reviewers: [
      {
        username: 'amoghjalan',
        linked_user: {
          id: '97fb2060-9af2-4f4a-853b-ee1105f00b65',
          name: 'Amogh Jalan'
        }
      }
    ],
    pr_link: 'https://github.com/monoclehq/monorepo/pull/1214',
    base_branch: 'master',
    head_branch: 'revert-1213-remove-migration-0gbg',
    created_at: '2023-10-31T21:27:14+00:00',
    updated_at: '2023-11-01T08:32:38+00:00',
    state_changed_at: '2023-11-01T08:32:37+00:00',
    commits: 1,
    additions: 0,
    deletions: 2,
    changed_files: 1,
    comments: 1,
    provider: 'github',
    first_commit_to_open: 7,
    first_response_time: 77,
    rework_time: 0,
    merge_time: 39846,
    merge_to_deploy: 22,
    cycle_time: 39923,
    rework_cycles: 0,
    repo_name: 'monorepo',
    original_reverted_pr: {
      id: 'cf6b1113-8300-460b-9d91-a1f53f26e731',
      number: '1213',
      title: 'hot_fix',
      state: 'MERGED',
      author: {
        username: 'samad-yar-khan',
        linked_user: {
          id: '391420ef-b113-4267-8c08-76c0f5140413',
          name: 'Samad Yar Khan'
        }
      },
      reviewers: [
        {
          username: 'jayantbh',
          linked_user: {
            id: '5b874fac-a4cf-4290-b07d-d79915102879',
            name: 'Jayant Bhawal'
          }
        }
      ],
      pr_link: 'https://github.com/monoclehq/monorepo/pull/1213',
      base_branch: 'master',
      head_branch: 'remove-migration-0gbg',
      created_at: '2023-10-31T21:25:03+00:00',
      updated_at: '2023-10-31T21:27:00+00:00',
      state_changed_at: '2023-10-31T21:26:59+00:00',
      commits: 1,
      additions: 2,
      deletions: 0,
      changed_files: 1,
      comments: 1,
      provider: 'github',
      first_commit_to_open: 20,
      first_response_time: 76,
      rework_time: 0,
      merge_time: 40,
      merge_to_deploy: 79,
      cycle_time: 116,
      rework_cycles: 0,
      repo_name: 'monorepo'
    }
  },
  {
    id: '56b2215a-f0ac-4c60-bc6e-8e583c9592e8',
    number: '1221',
    title: 'Revert "html url migration"',
    state: 'MERGED',
    author: {
      username: 'samad-yar-khan',
      linked_user: {
        id: '391420ef-b113-4267-8c08-76c0f5140413',
        name: 'Samad Yar Khan'
      }
    },
    reviewers: [
      {
        username: 'amoghjalan',
        linked_user: {
          id: '97fb2060-9af2-4f4a-853b-ee1105f00b65',
          name: 'Amogh Jalan'
        }
      }
    ],
    pr_link: 'https://github.com/monoclehq/monorepo/pull/1221',
    base_branch: 'master',
    head_branch: 'revert-1220-revert-1204-remove-migration-0gbg',
    created_at: '2023-11-01T11:38:41+00:00',
    updated_at: '2023-11-01T11:39:18+00:00',
    state_changed_at: '2023-11-01T11:39:17+00:00',
    commits: 1,
    additions: 0,
    deletions: 171,
    changed_files: 4,
    comments: 1,
    provider: 'github',
    first_commit_to_open: 13,
    first_response_time: 28,
    rework_time: 0,
    merge_time: 8,
    merge_to_deploy: 23051,
    cycle_time: 36,
    rework_cycles: 0,
    repo_name: 'monorepo',
    original_reverted_pr: {
      id: 'cef79b35-125a-4d52-9897-9d121e8fdd5b',
      number: '1220',
      title: 'html url migration',
      state: 'MERGED',
      author: {
        username: 'samad-yar-khan',
        linked_user: {
          id: '391420ef-b113-4267-8c08-76c0f5140413',
          name: 'Samad Yar Khan'
        }
      },
      reviewers: [
        {
          username: 'jayantbh',
          linked_user: {
            id: '5b874fac-a4cf-4290-b07d-d79915102879',
            name: 'Jayant Bhawal'
          }
        }
      ],
      pr_link: 'https://github.com/monoclehq/monorepo/pull/1220',
      base_branch: 'master',
      head_branch: 'revert-1204-remove-migration-0gbg',
      created_at: '2023-11-01T11:31:31+00:00',
      updated_at: '2023-11-01T11:37:03+00:00',
      state_changed_at: '2023-11-01T11:37:02+00:00',
      commits: 1,
      additions: 171,
      deletions: 0,
      changed_files: 4,
      comments: 1,
      provider: 'github',
      first_commit_to_open: 19,
      first_response_time: 271,
      rework_time: 0,
      merge_time: 60,
      merge_to_deploy: 23186,
      cycle_time: 331,
      rework_cycles: 0,
      repo_name: 'monorepo'
    }
  }
].map(
  (pr) =>
    ({
      ...pr,
      title: faker.lorem.sentence(),
      original_reverted_pr: {
        ...pr.original_reverted_pr,
        title: faker.lorem.sentence()
      }
    }) as PR
);

export const summaryPrsMock = [
  {
    number: '191',
    title: 'Add reviewers list in PR details',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 23,
    author: {
      username: 'dhruvagarwal',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/191',
    base_branch: 'master',
    head_branch: 'add-reviewers-in-pr-details',
    created_at: '2022-10-03T04:19:07+00:00',
    updated_at: '2022-10-03T04:19:30+00:00',
    state_changed_at: '2022-10-03T04:19:30+00:00',
    commits: 1,
    additions: 7,
    deletions: 3,
    changed_files: 4,
    comments: 0,
    provider: 'github'
  },
  {
    number: '67',
    title: 'Bump minimist from 1.2.5 to 1.2.6',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 29,
    author: {
      username: 'dependabot[bot]',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'web-manager-dash',
    pr_link: 'https://github.com/monoclehq/web-manager-dash/pull/67',
    base_branch: 'main',
    head_branch: 'dependabot/npm_and_yarn/minimist-1.2.6',
    created_at: '2022-10-02T14:01:44+00:00',
    updated_at: '2022-10-02T14:02:18+00:00',
    state_changed_at: '2022-10-02T14:02:13+00:00',
    commits: 1,
    additions: 1,
    deletions: 6,
    changed_files: 1,
    comments: 0,
    provider: 'github'
  },
  {
    number: '190',
    title: 'Remove team/id/careers API',
    state: 'MERGED',
    first_response_time: 26,
    rework_time: 0,
    merge_time: 23,
    cycle_time: 49,
    author: {
      username: 'jayantbh',
      linked_user: {
        id: '549c49d1-a275-42c4-910f-e23826b6e196',
        name: 'Jayant Bhawal'
      }
    },
    reviewers: [
      {
        username: 'dhruvagarwal',
        linked_user: null
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/190',
    base_branch: 'master',
    head_branch: 'jayantbh-patch-1',
    created_at: '2022-09-29T14:46:39+00:00',
    updated_at: '2022-09-29T14:47:29+00:00',
    state_changed_at: '2022-09-29T14:47:28+00:00',
    commits: 1,
    additions: 0,
    deletions: 38,
    changed_files: 1,
    comments: 1,
    provider: 'github'
  },
  {
    number: '188',
    title: 'bug fix',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 168,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/188',
    base_branch: 'master',
    head_branch: 'one-bug-fix',
    created_at: '2022-09-28T07:28:59+00:00',
    updated_at: '2022-09-28T07:31:48+00:00',
    state_changed_at: '2022-09-28T07:31:47+00:00',
    commits: 1,
    additions: 8,
    deletions: 6,
    changed_files: 2,
    comments: 0,
    provider: 'github'
  },
  {
    number: '187',
    title: 'bug fix',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 39,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/187',
    base_branch: 'master',
    head_branch: 'bug-fix',
    created_at: '2022-09-27T12:13:09+00:00',
    updated_at: '2022-09-27T12:13:49+00:00',
    state_changed_at: '2022-09-27T12:13:48+00:00',
    commits: 1,
    additions: 1,
    deletions: 1,
    changed_files: 1,
    comments: 0,
    provider: 'github'
  },
  {
    number: '186',
    title: 'send email only once for an item',
    state: 'MERGED',
    first_response_time: 2110,
    rework_time: 0,
    merge_time: 399,
    cycle_time: 2509,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [
      {
        username: 'dhruvagarwal',
        linked_user: null
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/186',
    base_branch: 'master',
    head_branch: 'overdue-items-change',
    created_at: '2022-09-26T10:47:30+00:00',
    updated_at: '2022-09-26T11:29:20+00:00',
    state_changed_at: '2022-09-26T11:29:19+00:00',
    commits: 1,
    additions: 5,
    deletions: 5,
    changed_files: 2,
    comments: 1,
    provider: 'github'
  },
  {
    number: '185',
    title: 'Use cached org tree in one on one apis',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 3808,
    author: {
      username: 'dhruvagarwal',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/185',
    base_branch: 'master',
    head_branch: 'move-org-tree-helpers-to-cache',
    created_at: '2022-09-26T00:58:12+00:00',
    updated_at: '2022-09-26T02:01:41+00:00',
    state_changed_at: '2022-09-26T02:01:40+00:00',
    commits: 3,
    additions: 32,
    deletions: 20,
    changed_files: 3,
    comments: 0,
    provider: 'github'
  },
  {
    number: '184',
    title: 'Fix org tree',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 22,
    author: {
      username: 'dhruvagarwal',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/184',
    base_branch: 'master',
    head_branch: 'fix-org-tree',
    created_at: '2022-09-25T23:42:06+00:00',
    updated_at: '2022-09-25T23:42:29+00:00',
    state_changed_at: '2022-09-25T23:42:28+00:00',
    commits: 4,
    additions: 128,
    deletions: 35,
    changed_files: 5,
    comments: 0,
    provider: 'github'
  },
  {
    number: '183',
    title: 'send empty array',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 28,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/183',
    base_branch: 'master',
    head_branch: 'send-empty-array',
    created_at: '2022-09-25T18:12:53+00:00',
    updated_at: '2022-09-25T18:13:22+00:00',
    state_changed_at: '2022-09-25T18:13:21+00:00',
    commits: 1,
    additions: 1,
    deletions: 1,
    changed_files: 1,
    comments: 0,
    provider: 'github'
  },
  {
    number: '182',
    title: 'send unique ids',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 39,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/182',
    base_branch: 'master',
    head_branch: 'unique-ids',
    created_at: '2022-09-25T18:08:32+00:00',
    updated_at: '2022-09-25T18:09:11+00:00',
    state_changed_at: '2022-09-25T18:09:11+00:00',
    commits: 1,
    additions: 8,
    deletions: 9,
    changed_files: 2,
    comments: 0,
    provider: 'github'
  },
  {
    number: '181',
    title: 'minor changes',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 65,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/181',
    base_branch: 'master',
    head_branch: 'minor-changes',
    created_at: '2022-09-25T17:46:40+00:00',
    updated_at: '2022-09-25T17:47:46+00:00',
    state_changed_at: '2022-09-25T17:47:45+00:00',
    commits: 1,
    additions: 5,
    deletions: 5,
    changed_files: 2,
    comments: 0,
    provider: 'github'
  },
  {
    number: '180',
    title: 'add api to get managed team and managers for a user',
    state: 'MERGED',
    first_response_time: 5951,
    rework_time: 0,
    merge_time: 98016,
    cycle_time: 103967,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [
      {
        username: 'kumarmunish',
        linked_user: null
      },
      {
        username: 'dhruvagarwal',
        linked_user: null
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/180',
    base_branch: 'master',
    head_branch: 'manager-id-changes',
    created_at: '2022-09-24T12:35:30+00:00',
    updated_at: '2022-09-25T17:28:18+00:00',
    state_changed_at: '2022-09-25T17:28:17+00:00',
    commits: 6,
    additions: 193,
    deletions: 51,
    changed_files: 6,
    comments: 5,
    provider: 'github'
  },
  {
    number: '179',
    title: 'add orgTree api to get teams managers',
    state: 'MERGED',
    first_response_time: 1088,
    rework_time: 0,
    merge_time: 2361,
    cycle_time: 3449,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [
      {
        username: 'dhruvagarwal',
        linked_user: null
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/179',
    base_branch: 'master',
    head_branch: 'org-permissions',
    created_at: '2022-09-24T09:40:44+00:00',
    updated_at: '2022-09-24T10:38:14+00:00',
    state_changed_at: '2022-09-24T10:38:13+00:00',
    commits: 3,
    additions: 39,
    deletions: 1,
    changed_files: 3,
    comments: 1,
    provider: 'github'
  },
  {
    number: '66',
    title: 'ip change',
    state: 'MERGED',
    first_response_time: 500,
    rework_time: 0,
    merge_time: 6,
    cycle_time: 506,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [
      {
        username: 'jayantbh',
        linked_user: {
          id: '549c49d1-a275-42c4-910f-e23826b6e196',
          name: 'Jayant Bhawal'
        }
      }
    ],
    repo_name: 'web-manager-dash',
    pr_link: 'https://github.com/monoclehq/web-manager-dash/pull/66',
    base_branch: 'main',
    head_branch: 'ip-change',
    created_at: '2022-09-20T19:03:20+00:00',
    updated_at: '2022-09-20T19:12:38+00:00',
    state_changed_at: '2022-09-20T19:11:46+00:00',
    commits: 2,
    additions: 3,
    deletions: 6,
    changed_files: 3,
    comments: 1,
    provider: 'github'
  },
  {
    number: '178',
    title: 'fetch only 250 commits and activities for bitbucket',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 875,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/178',
    base_branch: 'master',
    head_branch: 'add-activty-commits-limit',
    created_at: '2022-09-20T17:45:51+00:00',
    updated_at: '2022-09-20T18:00:27+00:00',
    state_changed_at: '2022-09-20T18:00:26+00:00',
    commits: 1,
    additions: 11,
    deletions: 1,
    changed_files: 1,
    comments: 0,
    provider: 'github'
  },
  {
    number: '177',
    title: 'setup cron',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 97,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/177',
    base_branch: 'master',
    head_branch: 'cron-setup',
    created_at: '2022-09-20T09:41:39+00:00',
    updated_at: '2022-09-20T09:43:18+00:00',
    state_changed_at: '2022-09-20T09:43:16+00:00',
    commits: 1,
    additions: 4,
    deletions: 2,
    changed_files: 2,
    comments: 0,
    provider: 'github'
  },
  {
    number: '176',
    title: 'org permissions',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 356390,
    author: {
      username: 'dhruvagarwal',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/176',
    base_branch: 'master',
    head_branch: 'org-permissions',
    created_at: '2022-09-19T14:42:59+00:00',
    updated_at: '2022-09-23T17:42:50+00:00',
    state_changed_at: '2022-09-23T17:42:49+00:00',
    commits: 8,
    additions: 232,
    deletions: 42,
    changed_files: 5,
    comments: 0,
    provider: 'github'
  },
  {
    number: '175',
    title: 'grant permissions for ses',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 31,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/175',
    base_branch: 'master',
    head_branch: 'modify-perms',
    created_at: '2022-09-19T10:41:38+00:00',
    updated_at: '2022-09-19T10:42:09+00:00',
    state_changed_at: '2022-09-19T10:42:09+00:00',
    commits: 1,
    additions: 8,
    deletions: 0,
    changed_files: 1,
    comments: 0,
    provider: 'github'
  },
  {
    number: '174',
    title: 'Overdue items cron',
    state: 'MERGED',
    first_response_time: 2346,
    rework_time: 0,
    merge_time: 387,
    cycle_time: 2733,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [
      {
        username: 'dhruvagarwal',
        linked_user: null
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/174',
    base_branch: 'master',
    head_branch: 'overdue-items-cron',
    created_at: '2022-09-19T09:15:01+00:00',
    updated_at: '2022-09-19T10:00:35+00:00',
    state_changed_at: '2022-09-19T10:00:34+00:00',
    commits: 4,
    additions: 403,
    deletions: 5,
    changed_files: 8,
    comments: 1,
    provider: 'github'
  },
  {
    number: '173',
    title: "Return user's highest role",
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 268,
    author: {
      username: 'dhruvagarwal',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/173',
    base_branch: 'master',
    head_branch: 'org-permissions',
    created_at: '2022-09-18T18:47:43+00:00',
    updated_at: '2022-09-18T18:52:12+00:00',
    state_changed_at: '2022-09-18T18:52:11+00:00',
    commits: 1,
    additions: 18,
    deletions: 13,
    changed_files: 3,
    comments: 0,
    provider: 'github'
  },
  {
    number: '64',
    title: 'Update scratchpad.yml',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 10693,
    author: {
      username: 'jayantbh',
      linked_user: {
        id: '549c49d1-a275-42c4-910f-e23826b6e196',
        name: 'Jayant Bhawal'
      }
    },
    reviewers: [],
    repo_name: 'web-manager-dash',
    pr_link: 'https://github.com/monoclehq/web-manager-dash/pull/64',
    base_branch: 'main',
    head_branch: 'jayantbh-patch-1',
    created_at: '2022-09-14T17:33:33+00:00',
    updated_at: '2022-09-14T20:31:46+00:00',
    state_changed_at: '2022-09-14T20:31:46+00:00',
    commits: 1,
    additions: 125,
    deletions: 13,
    changed_files: 5,
    comments: 0,
    provider: 'github'
  },
  {
    number: '171',
    title: 'Set role for user not in a team to ENGINEER',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 18,
    author: {
      username: 'jayantbh',
      linked_user: {
        id: '549c49d1-a275-42c4-910f-e23826b6e196',
        name: 'Jayant Bhawal'
      }
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/171',
    base_branch: 'master',
    head_branch: 'jayantbh-patch-1',
    created_at: '2022-09-14T08:43:43+00:00',
    updated_at: '2022-09-14T08:44:02+00:00',
    state_changed_at: '2022-09-14T08:44:01+00:00',
    commits: 1,
    additions: 1,
    deletions: 1,
    changed_files: 1,
    comments: 0,
    provider: 'github'
  },
  {
    number: '170',
    title: 'remove x-ray for staging',
    state: 'MERGED',
    first_response_time: 301,
    rework_time: 0,
    merge_time: 266,
    cycle_time: 567,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [
      {
        username: 'dhruvagarwal',
        linked_user: null
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/170',
    base_branch: 'master',
    head_branch: 'disable-xray',
    created_at: '2022-09-09T13:59:47+00:00',
    updated_at: '2022-09-09T14:09:15+00:00',
    state_changed_at: '2022-09-09T14:09:14+00:00',
    commits: 1,
    additions: 3,
    deletions: 12,
    changed_files: 1,
    comments: 1,
    provider: 'github'
  },
  {
    number: '169',
    title: 'Update README.md',
    state: 'MERGED',
    first_response_time: 35,
    rework_time: 0,
    merge_time: null,
    cycle_time: 25,
    author: {
      username: 'dhruvagarwal',
      linked_user: null
    },
    reviewers: [
      {
        username: 'kumarmunish',
        linked_user: null
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/169',
    base_branch: 'master',
    head_branch: 'dhruvagarwal-patch-1',
    created_at: '2022-09-09T11:50:26+00:00',
    updated_at: '2022-09-09T11:51:01+00:00',
    state_changed_at: '2022-09-09T11:50:51+00:00',
    commits: 1,
    additions: 1,
    deletions: 1,
    changed_files: 1,
    comments: 1,
    provider: 'github'
  },
  {
    number: '168',
    title: 'set merge_time to Null if merge_time < 0',
    state: 'MERGED',
    first_response_time: 2245,
    rework_time: 0,
    merge_time: null,
    cycle_time: 22,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [
      {
        username: 'dhruvagarwal',
        linked_user: null
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/168',
    base_branch: 'master',
    head_branch: 'merge-tim-fix',
    created_at: '2022-09-09T11:12:06+00:00',
    updated_at: '2022-09-09T11:49:31+00:00',
    state_changed_at: '2022-09-09T11:12:28+00:00',
    commits: 1,
    additions: 2,
    deletions: 0,
    changed_files: 1,
    comments: 1,
    provider: 'github'
  },
  {
    number: '167',
    title: 'add pinned users api',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 28708,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/167',
    base_branch: 'master',
    head_branch: 'pinned-users',
    created_at: '2022-09-08T07:53:08+00:00',
    updated_at: '2022-09-08T15:51:37+00:00',
    state_changed_at: '2022-09-08T15:51:36+00:00',
    commits: 4,
    additions: 138,
    deletions: 9,
    changed_files: 6,
    comments: 0,
    provider: 'github'
  },
  {
    number: '166',
    title: 'provide scopes in user config api',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 114613,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/166',
    base_branch: 'master',
    head_branch: 'user-scopes',
    created_at: '2022-09-06T13:27:53+00:00',
    updated_at: '2022-09-07T21:18:07+00:00',
    state_changed_at: '2022-09-07T21:18:06+00:00',
    commits: 2,
    additions: 23,
    deletions: 2,
    changed_files: 4,
    comments: 0,
    provider: 'github'
  },
  {
    number: '165',
    title: 'Add updated_at fields to 3 1:1 APIs',
    state: 'MERGED',
    first_response_time: 32941,
    rework_time: 0,
    merge_time: 35,
    cycle_time: 32976,
    author: {
      username: 'jayantbh',
      linked_user: {
        id: '549c49d1-a275-42c4-910f-e23826b6e196',
        name: 'Jayant Bhawal'
      }
    },
    reviewers: [
      {
        username: 'dhruvagarwal',
        linked_user: null
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/165',
    base_branch: 'master',
    head_branch: 'jayantbh-patch-1',
    created_at: '2022-09-03T11:34:56+00:00',
    updated_at: '2022-09-03T20:44:32+00:00',
    state_changed_at: '2022-09-03T20:44:32+00:00',
    commits: 1,
    additions: 3,
    deletions: 0,
    changed_files: 1,
    comments: 1,
    provider: 'github'
  },
  {
    number: '164',
    title: 'store PR commits',
    state: 'MERGED',
    first_response_time: 50946,
    rework_time: 0,
    merge_time: null,
    cycle_time: 413371,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [
      {
        username: 'dhruvagarwal',
        linked_user: null
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/164',
    base_branch: 'master',
    head_branch: 'get-pr-commits',
    created_at: '2022-09-01T17:36:50+00:00',
    updated_at: '2022-09-06T12:26:22+00:00',
    state_changed_at: '2022-09-06T12:26:21+00:00',
    commits: 9,
    additions: 123,
    deletions: 8,
    changed_files: 5,
    comments: 2,
    provider: 'github'
  },
  {
    number: '163',
    title: 'set is-active True while creating orgRepo',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 1035,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/163',
    base_branch: 'master',
    head_branch: 'mark-orgrepo-active',
    created_at: '2022-08-29T11:27:15+00:00',
    updated_at: '2022-08-29T11:44:30+00:00',
    state_changed_at: '2022-08-29T11:44:30+00:00',
    commits: 1,
    additions: 1,
    deletions: 0,
    changed_files: 1,
    comments: 0,
    provider: 'github'
  },
  {
    number: '162',
    title: 'use html url instead of url',
    state: 'MERGED',
    first_response_time: 1429,
    rework_time: 0,
    merge_time: 6,
    cycle_time: 1435,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [
      {
        username: 'jayantbh',
        linked_user: {
          id: '549c49d1-a275-42c4-910f-e23826b6e196',
          name: 'Jayant Bhawal'
        }
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/162',
    base_branch: 'master',
    head_branch: 'get-html-url-for-org',
    created_at: '2022-08-29T10:38:28+00:00',
    updated_at: '2022-08-29T11:02:24+00:00',
    state_changed_at: '2022-08-29T11:02:23+00:00',
    commits: 1,
    additions: 1,
    deletions: 1,
    changed_files: 1,
    comments: 1,
    provider: 'github'
  },
  {
    number: '161',
    title: 'get all repos',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 5,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/161',
    base_branch: 'master',
    head_branch: 'get-all-repos',
    created_at: '2022-08-28T19:43:37+00:00',
    updated_at: '2022-08-28T19:43:42+00:00',
    state_changed_at: '2022-08-28T19:43:42+00:00',
    commits: 1,
    additions: 5,
    deletions: 1,
    changed_files: 1,
    comments: 0,
    provider: 'github'
  },
  {
    number: '160',
    title: 'return team id in response',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 8,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/160',
    base_branch: 'master',
    head_branch: 'return-team-id',
    created_at: '2022-08-28T19:25:32+00:00',
    updated_at: '2022-08-28T19:25:40+00:00',
    state_changed_at: '2022-08-28T19:25:40+00:00',
    commits: 1,
    additions: 3,
    deletions: 1,
    changed_files: 1,
    comments: 0,
    provider: 'github'
  },
  {
    number: '159',
    title: 'Sync repo api',
    state: 'MERGED',
    first_response_time: 230,
    rework_time: 0,
    merge_time: 2424,
    cycle_time: 2654,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [
      {
        username: 'dhruvagarwal',
        linked_user: null
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/159',
    base_branch: 'master',
    head_branch: 'sync-repo-api',
    created_at: '2022-08-28T18:28:59+00:00',
    updated_at: '2022-08-28T19:13:14+00:00',
    state_changed_at: '2022-08-28T19:13:13+00:00',
    commits: 4,
    additions: 218,
    deletions: 10,
    changed_files: 8,
    comments: 1,
    provider: 'github'
  },
  {
    number: '158',
    title: 'add sync repo logs',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 96,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/158',
    base_branch: 'master',
    head_branch: 'add-logs',
    created_at: '2022-08-28T06:16:23+00:00',
    updated_at: '2022-08-28T06:17:59+00:00',
    state_changed_at: '2022-08-28T06:17:59+00:00',
    commits: 1,
    additions: 12,
    deletions: 2,
    changed_files: 2,
    comments: 0,
    provider: 'github'
  },
  {
    number: '157',
    title: 'Add additional keys in 1:1 resource',
    state: 'MERGED',
    first_response_time: 9412,
    rework_time: 0,
    merge_time: 105,
    cycle_time: 9517,
    author: {
      username: 'dhruvagarwal',
      linked_user: null
    },
    reviewers: [
      {
        username: 'kumarmunish',
        linked_user: null
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/157',
    base_branch: 'master',
    head_branch: 'know-the-manager',
    created_at: '2022-08-27T16:13:12+00:00',
    updated_at: '2022-08-27T18:51:49+00:00',
    state_changed_at: '2022-08-27T18:51:49+00:00',
    commits: 1,
    additions: 7,
    deletions: 79,
    changed_files: 1,
    comments: 1,
    provider: 'github'
  },
  {
    number: '156',
    title: 'Add reviewer metrics',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 1957,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/156',
    base_branch: 'add-buffers',
    head_branch: 'add-reviewer-metrics',
    created_at: '2022-08-27T14:34:53+00:00',
    updated_at: '2022-08-27T15:07:30+00:00',
    state_changed_at: '2022-08-27T15:07:30+00:00',
    commits: 1,
    additions: 46,
    deletions: 41,
    changed_files: 2,
    comments: 0,
    provider: 'github'
  },
  {
    number: '154',
    title: 'Add draft 1:1 creation on done',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 142393,
    author: {
      username: 'dhruvagarwal',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/154',
    base_branch: 'master',
    head_branch: 'add-buffers',
    created_at: '2022-08-26T00:18:49+00:00',
    updated_at: '2022-08-27T15:52:03+00:00',
    state_changed_at: '2022-08-27T15:52:02+00:00',
    commits: 29,
    additions: 652,
    deletions: 147,
    changed_files: 8,
    comments: 0,
    provider: 'github'
  },
  {
    number: '153',
    title: 'update users oneone history api',
    state: 'MERGED',
    first_response_time: 90901,
    rework_time: 1297,
    merge_time: 116,
    cycle_time: 92314,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [
      {
        username: 'dhruvagarwal',
        linked_user: null
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/153',
    base_branch: 'master',
    head_branch: 'history-api-changes',
    created_at: '2022-08-24T18:28:56+00:00',
    updated_at: '2022-08-25T20:07:31+00:00',
    state_changed_at: '2022-08-25T20:07:30+00:00',
    commits: 5,
    additions: 241,
    deletions: 154,
    changed_files: 4,
    comments: 2,
    provider: 'github'
  },
  {
    number: '152',
    title: 'address review comments',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 21,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/152',
    base_branch: 'master',
    head_branch: 'code-insight-apis',
    created_at: '2022-08-24T16:18:24+00:00',
    updated_at: '2022-08-24T16:18:46+00:00',
    state_changed_at: '2022-08-24T16:18:45+00:00',
    commits: 1,
    additions: 20,
    deletions: 19,
    changed_files: 5,
    comments: 0,
    provider: 'github'
  },
  {
    number: '151',
    title: 'WIP Team careers API',
    state: 'MERGED',
    first_response_time: 42088,
    rework_time: 0,
    merge_time: null,
    cycle_time: 72385,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [
      {
        username: 'dhruvagarwal',
        linked_user: null
      },
      {
        username: 'kumarmunish',
        linked_user: null
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/151',
    base_branch: 'master',
    head_branch: 'code-insight-apis',
    created_at: '2022-08-23T20:10:19+00:00',
    updated_at: '2022-08-24T16:16:45+00:00',
    state_changed_at: '2022-08-24T16:16:44+00:00',
    commits: 5,
    additions: 215,
    deletions: 152,
    changed_files: 6,
    comments: 6,
    provider: 'github'
  },
  {
    number: '150',
    title: 'Regularity apis',
    state: 'MERGED',
    first_response_time: 53214,
    rework_time: 9158,
    merge_time: 114,
    cycle_time: 62486,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [
      {
        username: 'dhruvagarwal',
        linked_user: null
      },
      {
        username: 'kumarmunish',
        linked_user: null
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/150',
    base_branch: 'master',
    head_branch: 'regularity-apis',
    created_at: '2022-08-22T18:47:41+00:00',
    updated_at: '2022-08-23T12:09:07+00:00',
    state_changed_at: '2022-08-23T12:09:07+00:00',
    commits: 8,
    additions: 264,
    deletions: 13,
    changed_files: 5,
    comments: 8,
    provider: 'github'
  },
  {
    number: '149',
    title: 'Add id field to agenda and action items response',
    state: 'MERGED',
    first_response_time: 101,
    rework_time: 0,
    merge_time: 10,
    cycle_time: 111,
    author: {
      username: 'jayantbh',
      linked_user: {
        id: '549c49d1-a275-42c4-910f-e23826b6e196',
        name: 'Jayant Bhawal'
      }
    },
    reviewers: [
      {
        username: 'kumarmunish',
        linked_user: null
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/149',
    base_branch: 'master',
    head_branch: 'jayantbh-patch-1',
    created_at: '2022-08-21T14:41:45+00:00',
    updated_at: '2022-08-21T14:43:37+00:00',
    state_changed_at: '2022-08-21T14:43:36+00:00',
    commits: 1,
    additions: 2,
    deletions: 0,
    changed_files: 1,
    comments: 1,
    provider: 'github'
  },
  {
    number: '148',
    title: 'api fixes',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 171316,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/148',
    base_branch: 'master',
    head_branch: 'api-bug-fixes',
    created_at: '2022-08-20T11:56:30+00:00',
    updated_at: '2022-08-22T11:31:47+00:00',
    state_changed_at: '2022-08-22T11:31:46+00:00',
    commits: 2,
    additions: 71,
    deletions: 39,
    changed_files: 5,
    comments: 0,
    provider: 'github'
  },
  {
    number: '147',
    title: 'Add script to add new users bulk in an org',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 223,
    author: {
      username: 'dhruvagarwal',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/147',
    base_branch: 'master',
    head_branch: 'add-user-gen-script',
    created_at: '2022-08-19T12:24:31+00:00',
    updated_at: '2022-08-19T12:28:15+00:00',
    state_changed_at: '2022-08-19T12:28:14+00:00',
    commits: 2,
    additions: 44,
    deletions: 1,
    changed_files: 3,
    comments: 0,
    provider: 'github'
  },
  {
    number: '61',
    title: '1on1 home',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 18850,
    author: {
      username: 'kakul',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'web-manager-dash',
    pr_link: 'https://github.com/monoclehq/web-manager-dash/pull/61',
    base_branch: 'staging',
    head_branch: '1on1-home',
    created_at: '2022-08-18T12:41:15+00:00',
    updated_at: '2022-08-21T13:38:50+00:00',
    state_changed_at: '2022-08-18T17:55:25+00:00',
    commits: 3,
    additions: 397,
    deletions: 15,
    changed_files: 9,
    comments: 0,
    provider: 'github'
  },
  {
    number: '146',
    title: 'APIs for users with not scheduled 1:1s',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 99969,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/146',
    base_branch: 'master',
    head_branch: 'add-one-to-one-apis',
    created_at: '2022-08-18T08:43:53+00:00',
    updated_at: '2022-08-19T12:30:03+00:00',
    state_changed_at: '2022-08-19T12:30:02+00:00',
    commits: 5,
    additions: 335,
    deletions: 81,
    changed_files: 5,
    comments: 0,
    provider: 'github'
  },
  {
    number: '145',
    title: 'bug fixes',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 17,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/145',
    base_branch: 'master',
    head_branch: 'api-fixes',
    created_at: '2022-08-18T06:05:33+00:00',
    updated_at: '2022-08-18T06:05:51+00:00',
    state_changed_at: '2022-08-18T06:05:50+00:00',
    commits: 1,
    additions: 6,
    deletions: 2,
    changed_files: 2,
    comments: 0,
    provider: 'github'
  },
  {
    number: '144',
    title: 'add homepage apis',
    state: 'MERGED',
    first_response_time: 562,
    rework_time: 0,
    merge_time: null,
    cycle_time: 3248,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [
      {
        username: 'dhruvagarwal',
        linked_user: null
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/144',
    base_branch: 'master',
    head_branch: 'add-one-to-one-apis',
    created_at: '2022-08-17T17:10:35+00:00',
    updated_at: '2022-08-17T18:04:44+00:00',
    state_changed_at: '2022-08-17T18:04:43+00:00',
    commits: 2,
    additions: 141,
    deletions: 1,
    changed_files: 3,
    comments: 4,
    provider: 'github'
  },
  {
    number: '143',
    title: 'Add one to one',
    state: 'MERGED',
    first_response_time: 91305,
    rework_time: 0,
    merge_time: null,
    cycle_time: 160904,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [
      {
        username: 'dhruvagarwal',
        linked_user: null
      },
      {
        username: 'kumarmunish',
        linked_user: null
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/143',
    base_branch: 'master',
    head_branch: 'add-one-to-one',
    created_at: '2022-08-15T10:31:05+00:00',
    updated_at: '2022-08-17T07:12:49+00:00',
    state_changed_at: '2022-08-17T07:12:49+00:00',
    commits: 7,
    additions: 562,
    deletions: 197,
    changed_files: 7,
    comments: 17,
    provider: 'github'
  },
  {
    number: '60',
    title: 'Add month info',
    state: 'MERGED',
    first_response_time: 131,
    rework_time: 0,
    merge_time: 14,
    cycle_time: 145,
    author: {
      username: 'kakul',
      linked_user: null
    },
    reviewers: [
      {
        username: 'jayantbh',
        linked_user: {
          id: '549c49d1-a275-42c4-910f-e23826b6e196',
          name: 'Jayant Bhawal'
        }
      }
    ],
    repo_name: 'web-manager-dash',
    pr_link: 'https://github.com/monoclehq/web-manager-dash/pull/60',
    base_branch: 'main',
    head_branch: 'add-month-1-1',
    created_at: '2022-08-11T21:28:03+00:00',
    updated_at: '2022-08-11T21:30:33+00:00',
    state_changed_at: '2022-08-11T21:30:28+00:00',
    commits: 1,
    additions: 10,
    deletions: 8,
    changed_files: 1,
    comments: 1,
    provider: 'github'
  },
  {
    number: '59',
    title: 'Monthly 1:1 insights',
    state: 'MERGED',
    first_response_time: 562,
    rework_time: 0,
    merge_time: 8545,
    cycle_time: 9107,
    author: {
      username: 'kakul',
      linked_user: null
    },
    reviewers: [
      {
        username: 'jayantbh',
        linked_user: {
          id: '549c49d1-a275-42c4-910f-e23826b6e196',
          name: 'Jayant Bhawal'
        }
      }
    ],
    repo_name: 'web-manager-dash',
    pr_link: 'https://github.com/monoclehq/web-manager-dash/pull/59',
    base_branch: 'staging',
    head_branch: 'monthly-1-1-insights',
    created_at: '2022-08-11T15:59:19+00:00',
    updated_at: '2022-08-11T18:35:53+00:00',
    state_changed_at: '2022-08-11T18:31:06+00:00',
    commits: 1,
    additions: 83,
    deletions: 22,
    changed_files: 2,
    comments: 1,
    provider: 'github'
  },
  {
    number: '142',
    title: 'add oneonone apis',
    state: 'MERGED',
    first_response_time: 243458,
    rework_time: 0,
    merge_time: null,
    cycle_time: 314982,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [
      {
        username: 'dhruvagarwal',
        linked_user: null
      },
      {
        username: 'kumarmunish',
        linked_user: null
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/142',
    base_branch: 'master',
    head_branch: 'add-one-to-one',
    created_at: '2022-08-11T13:43:59+00:00',
    updated_at: '2022-08-15T05:13:42+00:00',
    state_changed_at: '2022-08-15T05:13:41+00:00',
    commits: 5,
    additions: 546,
    deletions: 147,
    changed_files: 6,
    comments: 11,
    provider: 'github'
  },
  {
    number: '141',
    title: 'Fix PR details query',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 36,
    author: {
      username: 'dhruvagarwal',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/141',
    base_branch: 'master',
    head_branch: 'fix-pr-details-api',
    created_at: '2022-08-11T12:48:50+00:00',
    updated_at: '2022-08-11T12:49:27+00:00',
    state_changed_at: '2022-08-11T12:49:26+00:00',
    commits: 1,
    additions: 85,
    deletions: 16,
    changed_files: 1,
    comments: 0,
    provider: 'github'
  },
  {
    number: '58',
    title: 'Add types and mocks for one-on-one',
    state: 'MERGED',
    first_response_time: 769,
    rework_time: 0,
    merge_time: 8211,
    cycle_time: 8980,
    author: {
      username: 'kakul',
      linked_user: null
    },
    reviewers: [
      {
        username: 'jayantbh',
        linked_user: {
          id: '549c49d1-a275-42c4-910f-e23826b6e196',
          name: 'Jayant Bhawal'
        }
      },
      {
        username: 'kakul',
        linked_user: null
      }
    ],
    repo_name: 'web-manager-dash',
    pr_link: 'https://github.com/monoclehq/web-manager-dash/pull/58',
    base_branch: 'staging',
    head_branch: 'one-on-one',
    created_at: '2022-08-11T08:10:36+00:00',
    updated_at: '2022-08-11T10:40:16+00:00',
    state_changed_at: '2022-08-11T10:40:16+00:00',
    commits: 1,
    additions: 116,
    deletions: 2,
    changed_files: 2,
    comments: 5,
    provider: 'github'
  },
  {
    number: '140',
    title: 'Add user config API',
    state: 'MERGED',
    first_response_time: 228650,
    rework_time: 0,
    merge_time: 7,
    cycle_time: 228657,
    author: {
      username: 'dhruvagarwal',
      linked_user: null
    },
    reviewers: [
      {
        username: 'jayantbh',
        linked_user: {
          id: '549c49d1-a275-42c4-910f-e23826b6e196',
          name: 'Jayant Bhawal'
        }
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/140',
    base_branch: 'master',
    head_branch: 'user-config',
    created_at: '2022-08-08T19:44:15+00:00',
    updated_at: '2022-08-11T11:15:13+00:00',
    state_changed_at: '2022-08-11T11:15:12+00:00',
    commits: 2,
    additions: 32,
    deletions: 1,
    changed_files: 2,
    comments: 1,
    provider: 'github'
  },
  {
    number: '139',
    title: 'add oneonone model',
    state: 'MERGED',
    first_response_time: 212864,
    rework_time: 0,
    merge_time: null,
    cycle_time: 275998,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [
      {
        username: 'dhruvagarwal',
        linked_user: null
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/139',
    base_branch: 'master',
    head_branch: 'add-one-to-one',
    created_at: '2022-08-06T07:43:49+00:00',
    updated_at: '2022-08-09T12:23:47+00:00',
    state_changed_at: '2022-08-09T12:23:47+00:00',
    commits: 6,
    additions: 556,
    deletions: 2,
    changed_files: 5,
    comments: 2,
    provider: 'github'
  },
  {
    number: '138',
    title: 'add org chart',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 75351,
    author: {
      username: 'dhruvagarwal',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/138',
    base_branch: 'master',
    head_branch: 'add-org-chart',
    created_at: '2022-08-04T21:32:06+00:00',
    updated_at: '2022-08-05T18:27:57+00:00',
    state_changed_at: '2022-08-05T18:27:57+00:00',
    commits: 7,
    additions: 450,
    deletions: 6,
    changed_files: 12,
    comments: 0,
    provider: 'github'
  },
  {
    number: '137',
    title: 'add api to get available calendar slots for 2 users',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 87456,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/137',
    base_branch: 'master',
    head_branch: 'get-available-schedule',
    created_at: '2022-08-04T18:06:33+00:00',
    updated_at: '2022-08-05T18:24:10+00:00',
    state_changed_at: '2022-08-05T18:24:09+00:00',
    commits: 4,
    additions: 282,
    deletions: 1,
    changed_files: 6,
    comments: 0,
    provider: 'github'
  },
  {
    number: '136',
    title: 'Test user linking',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 1129,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/136',
    base_branch: 'master',
    head_branch: 'test-user-linking',
    created_at: '2022-08-03T17:37:39+00:00',
    updated_at: '2022-08-03T17:56:28+00:00',
    state_changed_at: '2022-08-03T17:56:28+00:00',
    commits: 3,
    additions: 232,
    deletions: 9,
    changed_files: 4,
    comments: 0,
    provider: 'github'
  },
  {
    number: '134',
    title: 'change name to lowercase',
    state: 'MERGED',
    first_response_time: 29,
    rework_time: 0,
    merge_time: null,
    cycle_time: 28,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [
      {
        username: 'dhruvagarwal',
        linked_user: null
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/134',
    base_branch: 'master',
    head_branch: 'change-case',
    created_at: '2022-08-03T14:23:58+00:00',
    updated_at: '2022-08-03T14:24:27+00:00',
    state_changed_at: '2022-08-03T14:24:26+00:00',
    commits: 1,
    additions: 1,
    deletions: 1,
    changed_files: 1,
    comments: 1,
    provider: 'github'
  },
  {
    number: '133',
    title: 'Send all user nodes for pr network irrespective of teams',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 1000,
    author: {
      username: 'dhruvagarwal',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/133',
    base_branch: 'master',
    head_branch: 'send-all-user-maps-in-pr-network',
    created_at: '2022-08-03T10:54:21+00:00',
    updated_at: '2022-08-03T11:11:02+00:00',
    state_changed_at: '2022-08-03T11:11:01+00:00',
    commits: 3,
    additions: 16,
    deletions: 37,
    changed_files: 6,
    comments: 0,
    provider: 'github'
  },
  {
    number: '132',
    title: 'fix pr title',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 30,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/132',
    base_branch: 'master',
    head_branch: 'fix-title',
    created_at: '2022-08-03T10:50:24+00:00',
    updated_at: '2022-08-03T10:50:55+00:00',
    state_changed_at: '2022-08-03T10:50:54+00:00',
    commits: 1,
    additions: 1,
    deletions: 1,
    changed_files: 1,
    comments: 0,
    provider: 'github'
  },
  {
    number: '131',
    title: 'raise HTTPError on bitbucket api calls',
    state: 'MERGED',
    first_response_time: 1659,
    rework_time: 0,
    merge_time: 298,
    cycle_time: 1957,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [
      {
        username: 'dhruvagarwal',
        linked_user: null
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/131',
    base_branch: 'master',
    head_branch: 'api-error-handling',
    created_at: '2022-08-03T09:49:18+00:00',
    updated_at: '2022-08-03T10:21:56+00:00',
    state_changed_at: '2022-08-03T10:21:55+00:00',
    commits: 2,
    additions: 72,
    deletions: 21,
    changed_files: 2,
    comments: 1,
    provider: 'github'
  },
  {
    number: '130',
    title: 'print worker logs',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 840,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/130',
    base_branch: 'master',
    head_branch: 'print-logs',
    created_at: '2022-08-02T16:49:27+00:00',
    updated_at: '2022-08-02T17:03:28+00:00',
    state_changed_at: '2022-08-02T17:03:27+00:00',
    commits: 1,
    additions: 4,
    deletions: 4,
    changed_files: 2,
    comments: 0,
    provider: 'github'
  },
  {
    number: '129',
    title: 'add logs',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 2622,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/129',
    base_branch: 'master',
    head_branch: 'worker-logs',
    created_at: '2022-08-01T16:15:44+00:00',
    updated_at: '2022-08-01T16:59:27+00:00',
    state_changed_at: '2022-08-01T16:59:26+00:00',
    commits: 1,
    additions: 8,
    deletions: 1,
    changed_files: 2,
    comments: 0,
    provider: 'github'
  },
  {
    number: '128',
    title: 'add author name and linking details',
    state: 'MERGED',
    first_response_time: 360,
    rework_time: 0,
    merge_time: null,
    cycle_time: 2093,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [
      {
        username: 'dhruvagarwal',
        linked_user: null
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/128',
    base_branch: 'master',
    head_branch: 'author-link',
    created_at: '2022-08-01T09:31:20+00:00',
    updated_at: '2022-08-01T10:06:14+00:00',
    state_changed_at: '2022-08-01T10:06:13+00:00',
    commits: 2,
    additions: 35,
    deletions: 28,
    changed_files: 3,
    comments: 1,
    provider: 'github'
  },
  {
    number: '127',
    title: 'remove usused methods',
    state: 'MERGED',
    first_response_time: 327,
    rework_time: 0,
    merge_time: 451,
    cycle_time: 778,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [
      {
        username: 'dhruvagarwal',
        linked_user: null
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/127',
    base_branch: 'master',
    head_branch: 'remove-unused-code',
    created_at: '2022-07-31T16:09:09+00:00',
    updated_at: '2022-07-31T16:22:08+00:00',
    state_changed_at: '2022-07-31T16:22:07+00:00',
    commits: 1,
    additions: 0,
    deletions: 20,
    changed_files: 1,
    comments: 1,
    provider: 'github'
  },
  {
    number: '126',
    title: 'handle get bb_repo error',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 63,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/126',
    base_branch: 'master',
    head_branch: 'handle-bb-repo-error',
    created_at: '2022-07-31T13:19:58+00:00',
    updated_at: '2022-07-31T13:21:02+00:00',
    state_changed_at: '2022-07-31T13:21:01+00:00',
    commits: 1,
    additions: 6,
    deletions: 1,
    changed_files: 1,
    comments: 0,
    provider: 'github'
  },
  {
    number: '123',
    title: 'send all internal users in conflict response',
    state: 'MERGED',
    first_response_time: 317,
    rework_time: 0,
    merge_time: 4768,
    cycle_time: 5085,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [
      {
        username: 'dhruvagarwal',
        linked_user: null
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/123',
    base_branch: 'master',
    head_branch: 'link-user-fixes',
    created_at: '2022-07-30T14:35:32+00:00',
    updated_at: '2022-07-30T16:00:17+00:00',
    state_changed_at: '2022-07-30T16:00:17+00:00',
    commits: 2,
    additions: 13,
    deletions: 8,
    changed_files: 1,
    comments: 4,
    provider: 'github'
  },
  {
    number: '121',
    title: 'discard incomplete reviews',
    state: 'MERGED',
    first_response_time: 4307,
    rework_time: 17616,
    merge_time: 10495,
    cycle_time: 32418,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [
      {
        username: 'dhruvagarwal',
        linked_user: null
      },
      {
        username: 'jayantbh',
        linked_user: {
          id: '549c49d1-a275-42c4-910f-e23826b6e196',
          name: 'Jayant Bhawal'
        }
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/121',
    base_branch: 'master',
    head_branch: 'discard-incomplete-reviews',
    created_at: '2022-07-26T07:57:15+00:00',
    updated_at: '2022-07-26T16:57:33+00:00',
    state_changed_at: '2022-07-26T16:57:33+00:00',
    commits: 1,
    additions: 2,
    deletions: 1,
    changed_files: 1,
    comments: 4,
    provider: 'github'
  },
  {
    number: '120',
    title: 'Error handling for get bb access token',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 183,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/120',
    base_branch: 'master',
    head_branch: 'access-error-handling',
    created_at: '2022-07-25T19:37:00+00:00',
    updated_at: '2022-07-25T19:40:03+00:00',
    state_changed_at: '2022-07-25T19:40:03+00:00',
    commits: 1,
    additions: 9,
    deletions: 6,
    changed_files: 1,
    comments: 0,
    provider: 'github'
  },
  {
    number: '118',
    title: 'enable x-ray at function level',
    state: 'MERGED',
    first_response_time: 61,
    rework_time: 0,
    merge_time: 12,
    cycle_time: 73,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [
      {
        username: 'dhruvagarwal',
        linked_user: null
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/118',
    base_branch: 'master',
    head_branch: 'set-xray-at-function-level',
    created_at: '2022-07-22T12:54:40+00:00',
    updated_at: '2022-07-22T12:55:53+00:00',
    state_changed_at: '2022-07-22T12:55:53+00:00',
    commits: 1,
    additions: 22,
    deletions: 6,
    changed_files: 1,
    comments: 1,
    provider: 'github'
  },
  {
    number: '117',
    title: 'Bb users',
    state: 'MERGED',
    first_response_time: 485,
    rework_time: 0,
    merge_time: null,
    cycle_time: 497324,
    author: {
      username: 'kumarmunish',
      linked_user: null
    },
    reviewers: [
      {
        username: 'dhruvagarwal',
        linked_user: null
      },
      {
        username: 'kumarmunish',
        linked_user: null
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/117',
    base_branch: 'master',
    head_branch: 'bb-users',
    created_at: '2022-07-19T17:32:57+00:00',
    updated_at: '2022-07-25T11:41:42+00:00',
    state_changed_at: '2022-07-25T11:41:41+00:00',
    commits: 14,
    additions: 417,
    deletions: 85,
    changed_files: 15,
    comments: 6,
    provider: 'github'
  },
  {
    number: '116',
    title: 'handle hardcoded github',
    state: 'MERGED',
    first_response_time: null,
    rework_time: 0,
    merge_time: null,
    cycle_time: 503767,
    author: {
      username: 'dhruvagarwal',
      linked_user: null
    },
    reviewers: [],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/monorepo/pull/116',
    base_branch: 'master',
    head_branch: 'handle-hardcoded-github',
    created_at: '2022-07-19T15:45:36+00:00',
    updated_at: '2022-07-25T11:41:44+00:00',
    state_changed_at: '2022-07-25T11:41:43+00:00',
    commits: 3,
    additions: 127,
    deletions: 65,
    changed_files: 7,
    comments: 0,
    provider: 'github'
  }
].map(
  (pr) =>
    ({
      ...pr,
      id: faker.datatype.uuid(),
      title: faker.lorem.sentence()
    }) as PR
);
