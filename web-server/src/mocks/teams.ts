import { map } from 'ramda';

export const getTeamMock = {
  'fcad1b7e-9576-46a7-a547-0ca8ffa752e0': {
    user: {
      id: 'fcad1b7e-9576-46a7-a547-0ca8ffa752e0',
      created_at: '2022-04-05T14:27:18.985623+00:00',
      org_id: 'dd9f324c-c9c8-4223-9c9a-5a5e6783755b',
      name: 'Dhruv Agarwal',
      updated_at: '2022-04-11T04:55:07.737+00:00',
      primary_email: 'dhruv@middlewarehq.com',
      is_deleted: false,
      org: {
        id: 'dd9f324c-c9c8-4223-9c9a-5a5e6783755b',
        created_at: '2022-03-21T10:47:11+00:00',
        name: 'middlewarehq.com',
        domain: 'middlewarehq.com'
      },
      contact: 'dhruvagarwal'
    },
    directs: [
      '3d8442e4-5c69-493b-812b-a6b910f650a7',
      'e665936b-5e7b-4eae-8987-5a7cd0edb80e',
      'c3c7c01d-c591-4305-b4b6-55d103e03616',
      '60e4181f-8a01-4fa1-af5c-eedb7474c816',
      'aa106cba-9b4a-4498-ad58-bffe8af35f0f',
      'de0e7fca-f671-4596-ba6e-f4258ba453cc',
      'ac155183-dbcd-448a-ba15-602ceeed7e93',
      'da13933e-2a11-494f-b44b-71e097d9e47b',
      '1514ca3b-2217-48ea-b2cb-d0df6822b63d',
      '0f78f2ac-b5cd-482a-bf66-fe59e07bc93c',
      '4c9211d2-b3c0-4861-bc7f-69827d543c1e',
      'fee60999-3237-414b-82f6-2191e76657e3',
      '23d2bcf0-9568-49c0-8f9c-8f7afed886e9',
      '5d2d559d-701a-4637-80ed-7c49673c94d8'
    ],
    managers: [] as const
  },
  '3d8442e4-5c69-493b-812b-a6b910f650a7': {
    user: {
      id: '3d8442e4-5c69-493b-812b-a6b910f650a7',
      created_at: '2022-04-05T14:27:18.985623+00:00',
      org_id: 'dd9f324c-c9c8-4223-9c9a-5a5e6783755b',
      name: 'Jayant Bhawal',
      updated_at: '2022-04-11T04:55:07.737+00:00',
      primary_email: 'jayantbh@monclehq.com',
      is_deleted: false,
      org: {
        id: 'dd9f324c-c9c8-4223-9c9a-5a5e6783755b',
        created_at: '2022-03-21T10:47:11+00:00',
        name: 'middlewarehq.com',
        domain: 'middlewarehq.com'
      },
      contact: 'jayantbh'
    },
    directs: [] as const,
    managers: ['fcad1b7e-9576-46a7-a547-0ca8ffa752e0']
  },
  'e665936b-5e7b-4eae-8987-5a7cd0edb80e': {
    user: {
      id: 'e665936b-5e7b-4eae-8987-5a7cd0edb80e',
      created_at: '2022-04-05T14:27:18.985623+00:00',
      org_id: 'dd9f324c-c9c8-4223-9c9a-5a5e6783755b',
      name: 'Mayank Vir',
      updated_at: '2022-04-11T04:55:07.737+00:00',
      primary_email: 'mayankvir@monclehq.com',
      is_deleted: false,
      org: {
        id: 'dd9f324c-c9c8-4223-9c9a-5a5e6783755b',
        created_at: '2022-03-21T10:47:11+00:00',
        name: 'middlewarehq.com',
        domain: 'middlewarehq.com'
      },
      contact: 'mayankvir'
    },
    directs: [] as const,
    managers: ['fcad1b7e-9576-46a7-a547-0ca8ffa752e0']
  },
  'c3c7c01d-c591-4305-b4b6-55d103e03616': {
    user: {
      id: 'c3c7c01d-c591-4305-b4b6-55d103e03616',
      created_at: '2022-04-05T14:27:18.985623+00:00',
      org_id: 'dd9f324c-c9c8-4223-9c9a-5a5e6783755b',
      name: 'Akshay Kumar',
      updated_at: '2022-04-11T04:55:07.737+00:00',
      primary_email: 'akshay1234@monclehq.com',
      is_deleted: false,
      org: {
        id: 'dd9f324c-c9c8-4223-9c9a-5a5e6783755b',
        created_at: '2022-03-21T10:47:11+00:00',
        name: 'middlewarehq.com',
        domain: 'middlewarehq.com'
      },
      contact: 'akshay1234'
    },
    directs: [] as const,
    managers: ['fcad1b7e-9576-46a7-a547-0ca8ffa752e0']
  },
  '60e4181f-8a01-4fa1-af5c-eedb7474c816': {
    user: {
      id: '60e4181f-8a01-4fa1-af5c-eedb7474c816',
      created_at: '2022-04-05T14:27:18.985623+00:00',
      org_id: 'dd9f324c-c9c8-4223-9c9a-5a5e6783755b',
      name: 'Munish Kumar',
      updated_at: '2022-04-11T04:55:07.737+00:00',
      primary_email: 'munishkumar@monclehq.com',
      is_deleted: false,
      org: {
        id: 'dd9f324c-c9c8-4223-9c9a-5a5e6783755b',
        created_at: '2022-03-21T10:47:11+00:00',
        name: 'middlewarehq.com',
        domain: 'middlewarehq.com'
      },
      contact: 'munishkumar'
    },
    directs: [] as const,
    managers: ['fcad1b7e-9576-46a7-a547-0ca8ffa752e0']
  },
  'aa106cba-9b4a-4498-ad58-bffe8af35f0f': {
    user: {
      id: 'aa106cba-9b4a-4498-ad58-bffe8af35f0f',
      created_at: '2022-04-05T14:27:18.985623+00:00',
      org_id: 'dd9f324c-c9c8-4223-9c9a-5a5e6783755b',
      name: 'Sherub Thakur',
      updated_at: '2022-04-11T04:55:07.737+00:00',
      primary_email: 'sherubthakur@monclehq.com',
      is_deleted: false,
      org: {
        id: 'dd9f324c-c9c8-4223-9c9a-5a5e6783755b',
        created_at: '2022-03-21T10:47:11+00:00',
        name: 'middlewarehq.com',
        domain: 'middlewarehq.com'
      },
      contact: 'sherubthakur'
    },
    directs: [] as const,
    managers: ['fcad1b7e-9576-46a7-a547-0ca8ffa752e0']
  },
  'de0e7fca-f671-4596-ba6e-f4258ba453cc': {
    user: {
      id: 'de0e7fca-f671-4596-ba6e-f4258ba453cc',
      created_at: '2022-04-05T14:27:18.985623+00:00',
      org_id: 'dd9f324c-c9c8-4223-9c9a-5a5e6783755b',
      name: 'Mohammed Gufran',
      updated_at: '2022-04-11T04:55:07.737+00:00',
      primary_email: 'Gufran@monclehq.com',
      is_deleted: false,
      org: {
        id: 'dd9f324c-c9c8-4223-9c9a-5a5e6783755b',
        created_at: '2022-03-21T10:47:11+00:00',
        name: 'middlewarehq.com',
        domain: 'middlewarehq.com'
      },
      contact: 'Gufran'
    },
    directs: [] as const,
    managers: ['fcad1b7e-9576-46a7-a547-0ca8ffa752e0']
  },
  'da13933e-2a11-494f-b44b-71e097d9e47b': {
    user: {
      id: 'da13933e-2a11-494f-b44b-71e097d9e47b',
      created_at: '2022-04-05T14:27:18.985623+00:00',
      org_id: 'dd9f324c-c9c8-4223-9c9a-5a5e6783755b',
      name: 'Himani Gandhi',
      updated_at: '2022-04-11T04:55:07.737+00:00',
      primary_email: 'himanigandhi@monclehq.com',
      is_deleted: false,
      org: {
        id: 'dd9f324c-c9c8-4223-9c9a-5a5e6783755b',
        created_at: '2022-03-21T10:47:11+00:00',
        name: 'middlewarehq.com',
        domain: 'middlewarehq.com'
      },
      contact: 'himanigandhi'
    },
    directs: [] as const,
    managers: ['fcad1b7e-9576-46a7-a547-0ca8ffa752e0']
  },
  '1514ca3b-2217-48ea-b2cb-d0df6822b63d': {
    user: {
      id: '1514ca3b-2217-48ea-b2cb-d0df6822b63d',
      created_at: '2022-04-05T14:27:18.985623+00:00',
      org_id: 'dd9f324c-c9c8-4223-9c9a-5a5e6783755b',
      name: 'Swarnima Gupta',
      updated_at: '2022-04-11T04:55:07.737+00:00',
      primary_email: 'swarnimagupta@monclehq.com',
      is_deleted: false,
      org: {
        id: 'dd9f324c-c9c8-4223-9c9a-5a5e6783755b',
        created_at: '2022-03-21T10:47:11+00:00',
        name: 'middlewarehq.com',
        domain: 'middlewarehq.com'
      },
      contact: 'swarnimagupta'
    },
    directs: [] as const,
    managers: ['fcad1b7e-9576-46a7-a547-0ca8ffa752e0']
  },
  '5d2d559d-701a-4637-80ed-7c49673c94d8': {
    user: {
      id: '5d2d559d-701a-4637-80ed-7c49673c94d8',
      created_at: '2022-04-05T14:27:18.985623+00:00',
      org_id: 'dd9f324c-c9c8-4223-9c9a-5a5e6783755b',
      name: 'Raghav Dua',
      updated_at: '2022-04-11T04:55:07.737+00:00',
      primary_email: 'raghavd@monclehq.com',
      is_deleted: false,
      org: {
        id: 'dd9f324c-c9c8-4223-9c9a-5a5e6783755b',
        created_at: '2022-03-21T10:47:11+00:00',
        name: 'middlewarehq.com',
        domain: 'middlewarehq.com'
      },
      contact: 'raghavd'
    },
    directs: [] as const,
    managers: ['fcad1b7e-9576-46a7-a547-0ca8ffa752e0']
  }
};

const userIds = Object.keys(getTeamMock);

const usersMockForTeamV2 = map((val) => {
  const user: User & typeof val.user = {
    ...val.user,
    identities: { github: { username: val.user.contact } }
  };

  delete user.contact;

  return user;
}, getTeamMock as any);

export const getTeamV2Mock = {
  teams: [
    {
      id: '73a6009a-64bf-49f0-91f5-3db1219284de',
      org_id: '23d9e173-e98d-4ffd-b025-b5e7dbf0962f',
      name: 'Foundation',
      member_ids: userIds.slice(1),
      manager_id: userIds[0],
      created_at: '2022-05-01T10:18:36.046687+00:00',
      updated_at: '2022-05-02T17:03:13.698+00:00',
      is_deleted: false
    },
    {
      id: 'b924f66f-6888-4dc2-bd69-850517b9d027',
      org_id: '23d9e173-e98d-4ffd-b025-b5e7dbf0962f',
      name: 'Engineering',
      member_ids: userIds.slice(1),
      manager_id: userIds[0],
      created_at: '2022-05-01T10:18:36.046687+00:00',
      updated_at: '2022-05-02T17:03:13.698+00:00',
      is_deleted: false
    }
  ],
  users: usersMockForTeamV2,
  teamReposProdBranchMap: {
    '73a6009a-64bf-49f0-91f5-3db1219284de': [
      {
        team_id: '73a6009a-64bf-49f0-91f5-3db1219284de',
        org_repo_id: '3a029e7a-2d59-492e-8c52-d1b69472f0d3',
        name: 'new_team',
        prod_branches: ['^main$'],
        is_active: true
      },
      {
        team_id: '73a6009a-64bf-49f0-91f5-3db1219284de',
        org_repo_id: 'fa2d219b-c644-40e7-86ef-c976b40f2d23',
        name: 'new_team',
        prod_branches: ['^master$'],
        is_active: true
      },
      {
        team_id: '73a6009a-64bf-49f0-91f5-3db1219284de',
        org_repo_id: '53a8195c-853c-484a-a8ca-c92af7a5528a',
        name: 'new_team',
        prod_branches: ['^main$'],
        is_active: true
      },
      {
        team_id: '73a6009a-64bf-49f0-91f5-3db1219284de',
        org_repo_id: '7fbb245d-e6ed-41a6-8fb8-177f67bb544a',
        name: 'new_team',
        prod_branches: ['^main$'],
        is_active: true
      },
      {
        team_id: '73a6009a-64bf-49f0-91f5-3db1219284de',
        org_repo_id: '837afa00-169b-49f1-878f-94ab66335994',
        name: 'new_team',
        prod_branches: ['^main$'],
        is_active: true
      },
      {
        team_id: '73a6009a-64bf-49f0-91f5-3db1219284de',
        org_repo_id: 'f5680f06-2e47-4dde-a00c-73d1a3cab17f',
        name: 'new_team',
        prod_branches: ['^master$'],
        is_active: true
      }
    ],
    'b924f66f-6888-4dc2-bd69-850517b9d027': [
      {
        team_id: 'b924f66f-6888-4dc2-bd69-850517b9d027',
        org_repo_id: '7fbb245d-e6ed-41a6-8fb8-177f67bb544a',
        name: "Jayant's Team (ask b4 deleting)",
        prod_branches: ['^main$'],
        is_active: true
      },
      {
        team_id: 'b924f66f-6888-4dc2-bd69-850517b9d027',
        org_repo_id: 'fa2d219b-c644-40e7-86ef-c976b40f2d23',
        name: "Jayant's Team (ask b4 deleting)",
        prod_branches: ['^master$'],
        is_active: true
      }
    ]
  }
};

export const mockManagers = [
  {
    email: 'dhruv@middlewarehq.com',
    id: 'bd358331-7f88-4f40-bd22-953f4799e9aa',
    name: 'Dhruv Agarwal',
    avatar_url: 'https://github.com/dhruvagarwal.png?size=128'
  }
];
