export const mockTeamExcludedPrs = [
  {
    id: 'f5e0797f-560c-41a5-af23-5b830604e90a',
    number: '47',
    title: 'Introduce internal APIs',
    state: 'MERGED',
    first_response_time: 306000,
    rework_time: 180000,
    merge_time: 21600,
    cycle_time: 507600,
    author: {
      username: 'jayantbh',
      linked_user: {
        id: 'e0e34d92-13e1-49e0-8e61-9492a7dbc00c',
        name: 'Jayant Bhawal'
      }
    },
    reviewers: [
      {
        username: 'akshaykmr',
        linked_user: {
          id: '1b734ee0-3f51-4f90-9359-34eb02cce2be',
          name: 'jayantbh'
        }
      },
      {
        username: 'jayantbh',
        linked_user: {
          id: '8cf9db2f-ddb9-4637-96d6-9ca6ca8ecb0f',
          name: 'akshaykmr'
        }
      }
    ],
    repo_name: 'monorepo',
    pr_link: 'https://github.com/monoclehq/web-manager-dash/pull/47',
    base_branch: 'main',
    head_branch: 'pulls',
    created_at: '2023-07-15T22:31:04.505Z',
    updated_at: '2023-07-15T22:01:34.181Z',
    state_changed_at: '2023-07-17T16:26:18.773Z',
    commits: 3,
    additions: 292,
    deletions: 277,
    changed_files: 4,
    comments: 0,
    rework_cycles: 1,
    provider: 'github'
  },
  {
    id: '51f7a782-32d1-4965-aff3-32035d1124b5',
    number: '36',
    title: 'Build basic experts UI',
    state: 'MERGED',
    first_response_time: 327600,
    rework_time: 93600,
    merge_time: 36000,
    cycle_time: 457200,
    author: {
      username: 'jayantbh',
      linked_user: {
        id: 'e0e34d92-13e1-49e0-8e61-9492a7dbc00c',
        name: 'Jayant Bhawal'
      }
    },
    reviewers: [
      {
        username: 'akshaykmr',
        linked_user: {
          id: '5e98a7bd-026a-4d35-9b14-d6d24b00c8eb',
          name: 'dhruvagarwal'
        }
      },
      {
        username: 'akshaykmr',
        linked_user: {
          id: '82c7d37d-29ff-42d2-a94d-327b5db972e2',
          name: 'akshaykmr'
        }
      }
    ],
    repo_name: 'infra-platform',
    pr_link: 'https://github.com/monoclehq/web-manager-dash/pull/36',
    base_branch: 'main',
    head_branch: 'pulls',
    created_at: '2023-07-16T23:59:07.624Z',
    updated_at: '2023-07-17T01:26:45.341Z',
    state_changed_at: '2023-07-17T18:37:10.178Z',
    commits: 9,
    additions: 169,
    deletions: 258,
    changed_files: 10,
    comments: 6,
    rework_cycles: 4,
    provider: 'github'
  }
].map((pr) => pr.id);
