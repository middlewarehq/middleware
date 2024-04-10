import { Row } from '@/constants/db';
import { BaseRepo } from '@/types/resources';

export const teamReposMock = [
  {
    org_id: '23d9e173-e98d-4ffd-b025-b5e7dbf0962f',
    name: 'web-manager-dash',
    provider: 'github',
    created_at: '2022-04-15T16:26:40.855853+00:00',
    updated_at: '2022-05-02T16:06:39.386+00:00',
    id: '328d4e5d-ae5d-45f9-9818-66f56110a3a9',
    org_name: 'monoclehq',
    is_active: true
  },
  {
    org_id: '23d9e173-e98d-4ffd-b025-b5e7dbf0962f',
    name: 'monorepo',
    provider: 'github',
    created_at: '2022-04-15T16:26:40.855853+00:00',
    updated_at: '2022-05-02T16:06:39.386+00:00',
    id: '5b79d8e1-7133-48dc-876d-0670495800c2',
    org_name: 'monoclehq',
    is_active: true
  }
];

export const teamBaseReposMock: BaseRepo[] = [
  {
    name: 'web-manager-dash',
    id: '328d4e5d-ae5d-45f9-9818-66f56110a3a9',
    parent: 'monoclehq',
    branch: 'main',
    desc: '',
    language: 'ts',
    slug: 'web-manager-dash',
    web_url: '//app.middlewarehq.com'
  },
  {
    name: 'monorepo',
    id: '5b79d8e1-7133-48dc-876d-0670495800c2',
    parent: 'monoclehq',
    branch: 'main',
    desc: '',
    language: 'ts',
    slug: 'web-manager-dash',
    web_url: '//app.middlewarehq.com'
  }
];

export const unassignedReposMock = [
  {
    id: 'facc5ffb-31a9-4094-9a12-818f333b7acc',
    name: 'example-docs'
  },
  { id: 'e503a6b7-f14c-4a79-aa98-1797cef6928b', name: 'dum-e' }
] as Row<'OrgRepo'>[];

export const incidentSourceMock = {
  created_at: '2024-04-05T07:37:06.720174+00:00',
  updated_at: '2024-04-05T07:37:06.720231+00:00',
  org_id: 'd9b3d829-9b51-457f-85ab-107d20119524',
  setting: {
    incident_sources: ['INCIDENT_SERVICE']
  }
};
