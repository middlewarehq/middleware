import faker from '@faker-js/faker';

import { revertPrsMock, summaryPrsMock } from '@/mocks/pull-requests';
import {
  IncidentApiResponseType,
  Incident,
  DeploymentWithIncidents
} from '@/types/resources';

const deployments_with_incidents = [
  {
    id: 'b9724793-d9f9-4181-ab83-a346e56ddcba',
    status: 'SUCCESS',
    head_branch: 'master',
    event_actor: {
      username: 'amoghjalan',
      linked_user: null
    },
    created_at: '2023-08-23T13:30:07.222348+00:00',
    updated_at: '2023-11-01T14:35:31.126519+00:00',
    conducted_at: '2023-08-23T10:37:41+00:00',
    pr_count: 0,
    run_duration: 446,
    html_url: 'https://github.com/monoclehq/monorepo/actions/runs/5950237357',
    repo_workflow_id: '45a938c0-bfeb-4c0f-9b9b-c86c1575c440',
    incidents: []
  },
  {
    id: '6d70207d-bc6e-4beb-a4ac-a37bc4fbbfe6',
    status: 'SUCCESS',
    head_branch: 'main',
    event_actor: {
      username: 'jayantbh',
      linked_user: null
    },
    created_at: '2023-08-23T13:30:07.481421+00:00',
    updated_at: '2023-11-01T14:20:33.454764+00:00',
    conducted_at: '2023-08-23T12:26:29+00:00',
    pr_count: 0,
    run_duration: 380,
    html_url:
      'https://github.com/monoclehq/web-manager-dash/actions/runs/5951271187',
    repo_workflow_id: '6415b349-1f49-4f97-96f9-dc5ac8eaf788',
    incidents: []
  },
  {
    id: '45c49627-991a-4a78-a8c8-8abd5cb6e48c',
    status: 'SUCCESS',
    head_branch: 'GROW-678',
    event_actor: {
      username: 'abhayKumarVats',
      linked_user: null
    },
    created_at: '2023-08-23T19:30:10.757769+00:00',
    updated_at: '2023-11-01T14:20:33.454764+00:00',
    conducted_at: '2023-08-23T14:04:00+00:00',
    pr_count: 0,
    run_duration: 352,
    html_url:
      'https://github.com/monoclehq/web-manager-dash/actions/runs/5952380656',
    repo_workflow_id: '9d790dd5-bcf8-4afd-8f9b-9561709fffc0',
    incidents: []
  },
  {
    id: '2ac9acaf-4da2-46dc-b9c2-c828f8427544',
    status: 'SUCCESS',
    head_branch: 'main',
    event_actor: {
      username: 'abhayKumarVats',
      linked_user: null
    },
    created_at: '2023-08-23T19:30:07.280690+00:00',
    updated_at: '2023-11-01T14:20:33.454764+00:00',
    conducted_at: '2023-08-23T14:19:01+00:00',
    pr_count: 0,
    run_duration: 352,
    html_url:
      'https://github.com/monoclehq/web-manager-dash/actions/runs/5952568004',
    repo_workflow_id: '6415b349-1f49-4f97-96f9-dc5ac8eaf788',
    incidents: []
  },
  {
    id: 'a477624f-6c54-4f81-8389-00121049373c',
    status: 'SUCCESS',
    head_branch: 'main',
    event_actor: {
      username: 'abhayKumarVats',
      linked_user: null
    },
    created_at: '2023-08-23T19:30:07.278196+00:00',
    updated_at: '2023-11-01T14:20:33.454764+00:00',
    conducted_at: '2023-08-23T16:58:40+00:00',
    pr_count: 0,
    run_duration: 359,
    html_url:
      'https://github.com/monoclehq/web-manager-dash/actions/runs/5954243794',
    repo_workflow_id: '6415b349-1f49-4f97-96f9-dc5ac8eaf788',
    incidents: []
  },
  {
    id: 'fdf575df-9141-4945-91d5-4a640cb5cb96',
    status: 'SUCCESS',
    head_branch: 'master',
    event_actor: {
      username: 'samad-yar-khan',
      linked_user: null
    },
    created_at: '2023-08-24T01:30:06.827722+00:00',
    updated_at: '2023-11-01T14:35:30.590799+00:00',
    conducted_at: '2023-08-23T19:51:18+00:00',
    pr_count: 0,
    run_duration: 111,
    html_url: 'https://github.com/monoclehq/monorepo/actions/runs/5955816736',
    repo_workflow_id: '45a938c0-bfeb-4c0f-9b9b-c86c1575c440',
    incidents: []
  },
  {
    id: '45fc9000-b3dd-4ef2-b214-8acfbe79e93e',
    status: 'SUCCESS',
    head_branch: 'master',
    event_actor: {
      username: 'samad-yar-khan',
      linked_user: null
    },
    created_at: '2023-08-24T01:30:06.827649+00:00',
    updated_at: '2023-11-01T14:35:30.590799+00:00',
    conducted_at: '2023-08-23T19:51:25+00:00',
    pr_count: 0,
    run_duration: 448,
    html_url: 'https://github.com/monoclehq/monorepo/actions/runs/5955817617',
    repo_workflow_id: '45a938c0-bfeb-4c0f-9b9b-c86c1575c440',
    incidents: []
  },
  {
    id: '2fa35d47-06b3-4afa-b5e5-a96041a5ca1d',
    status: 'SUCCESS',
    head_branch: 'master',
    event_actor: {
      username: 'samad-yar-khan',
      linked_user: null
    },
    created_at: '2023-08-24T01:30:06.827570+00:00',
    updated_at: '2023-11-01T14:35:30.590799+00:00',
    conducted_at: '2023-08-23T19:51:33+00:00',
    pr_count: 0,
    run_duration: 526,
    html_url: 'https://github.com/monoclehq/monorepo/actions/runs/5955818737',
    repo_workflow_id: '45a938c0-bfeb-4c0f-9b9b-c86c1575c440',
    incidents: []
  },
  {
    id: '7901b5da-4654-4d11-9307-e57a3768d0a6',
    status: 'SUCCESS',
    head_branch: 'master',
    event_actor: {
      username: 'samad-yar-khan',
      linked_user: null
    },
    created_at: '2023-08-24T01:30:06.827439+00:00',
    updated_at: '2023-11-01T14:35:30.590799+00:00',
    conducted_at: '2023-08-23T20:03:51+00:00',
    pr_count: 0,
    run_duration: 448,
    html_url: 'https://github.com/monoclehq/monorepo/actions/runs/5955923417',
    repo_workflow_id: '45a938c0-bfeb-4c0f-9b9b-c86c1575c440',
    incidents: []
  },
  {
    id: '73ddb407-9852-4ac7-8271-0a9c7dee2f5f',
    status: 'SUCCESS',
    head_branch: 'master',
    event_actor: {
      username: 'samad-yar-khan',
      linked_user: null
    },
    created_at: '2023-08-24T01:30:06.825050+00:00',
    updated_at: '2023-11-01T14:35:30.590799+00:00',
    conducted_at: '2023-08-23T20:04:02+00:00',
    pr_count: 0,
    run_duration: 523,
    html_url: 'https://github.com/monoclehq/monorepo/actions/runs/5955924993',
    repo_workflow_id: '45a938c0-bfeb-4c0f-9b9b-c86c1575c440',
    incidents: []
  },
  {
    id: '9fe985c3-fcdc-4348-8c4c-b4b40bd6ed2c',
    status: 'SUCCESS',
    head_branch: 'main',
    event_actor: {
      username: 'shivam-bit',
      linked_user: null
    },
    created_at: '2023-08-24T07:30:11.596879+00:00',
    updated_at: '2023-11-01T14:20:33.454764+00:00',
    conducted_at: '2023-08-24T05:28:42+00:00',
    pr_count: 0,
    run_duration: 421,
    html_url:
      'https://github.com/monoclehq/web-manager-dash/actions/runs/5959856511',
    repo_workflow_id: '9d790dd5-bcf8-4afd-8f9b-9561709fffc0',
    incidents: []
  },
  {
    id: 'cbc8c31b-7bf2-47c1-919c-481366f96765',
    status: 'SUCCESS',
    head_branch: 'main',
    event_actor: {
      username: 'abhayKumarVats',
      linked_user: null
    },
    created_at: '2023-08-24T07:30:07.749883+00:00',
    updated_at: '2023-11-01T14:20:33.454764+00:00',
    conducted_at: '2023-08-24T06:21:02+00:00',
    pr_count: 0,
    run_duration: 364,
    html_url:
      'https://github.com/monoclehq/web-manager-dash/actions/runs/5960214438',
    repo_workflow_id: '6415b349-1f49-4f97-96f9-dc5ac8eaf788',
    incidents: []
  },
  {
    id: 'f741baea-fc18-4402-b361-4f3113d28b47',
    status: 'SUCCESS',
    head_branch: 'main',
    event_actor: {
      username: 'abhayKumarVats',
      linked_user: null
    },
    created_at: '2023-08-24T13:30:07.219755+00:00',
    updated_at: '2023-11-01T14:20:33.454764+00:00',
    conducted_at: '2023-08-24T07:56:01+00:00',
    pr_count: 0,
    run_duration: 352,
    html_url:
      'https://github.com/monoclehq/web-manager-dash/actions/runs/5961003260',
    repo_workflow_id: '6415b349-1f49-4f97-96f9-dc5ac8eaf788',
    incidents: [
      {
        id: '469ae457-c68d-4d8b-9ca4-6c6f59d8c067',
        title: 'Incident 1',
        key: 'b355996e-a73d-4f13-9aca-0aeabf5e3927',
        incident_number: 1,
        provider: 'opsgenie',
        status: 'resolved',
        creation_date: '2023-08-24T08:04:16.987000+00:00',
        resolved_date: '2023-08-24T08:04:44.853000+00:00',
        acknowledged_date: '2023-08-24T08:04:50.650000+00:00',
        assigned_to: {
          username: null,
          linked_user: null
        },
        assignees: [
          {
            username: '6183722e-6a89-409d-8c8a-a2d267731e48',
            linked_user: null
          }
        ],
        url: null,
        summary: null,
        incident_type: 'INCIDENT'
      },
      {
        id: '34a11fc8-5245-4d5f-b088-fed5fedd983b',
        title: 'Incident 2',
        key: '364b5351-415c-4173-a2b7-b3d243531ec2',
        incident_number: 2,
        provider: 'opsgenie',
        status: 'triggered',
        creation_date: '2023-08-24T08:48:51.996000+00:00',
        resolved_date: null,
        acknowledged_date: null,
        assigned_to: {
          username: null,
          linked_user: null
        },
        assignees: [
          {
            username: '6183722e-6a89-409d-8c8a-a2d267731e48',
            linked_user: null
          }
        ],
        url: null,
        summary: null,
        incident_type: 'INCIDENT'
      }
    ]
  },
  {
    id: '32b6e2bf-03b1-46f6-81fc-c7204e4c826f',
    status: 'SUCCESS',
    head_branch: 'master',
    event_actor: {
      username: 'amoghjalan',
      linked_user: null
    },
    created_at: '2023-08-24T13:30:07.089203+00:00',
    updated_at: '2023-11-01T14:35:30.590799+00:00',
    conducted_at: '2023-08-24T09:47:27+00:00',
    pr_count: 0,
    run_duration: 106,
    html_url: 'https://github.com/monoclehq/monorepo/actions/runs/5962138376',
    repo_workflow_id: '45a938c0-bfeb-4c0f-9b9b-c86c1575c440',
    incidents: []
  },
  {
    id: 'd2a84dbc-14b6-4a5b-bfc2-8f70e68eb310',
    status: 'SUCCESS',
    head_branch: 'fix/ai-sprint-summary',
    event_actor: {
      username: 'shivam-bit',
      linked_user: null
    },
    created_at: '2023-08-24T19:30:07.899653+00:00',
    updated_at: '2023-11-01T14:20:33.454764+00:00',
    conducted_at: '2023-08-24T16:35:47+00:00',
    pr_count: 0,
    run_duration: 402,
    html_url:
      'https://github.com/monoclehq/web-manager-dash/actions/runs/5966458314',
    repo_workflow_id: '9d790dd5-bcf8-4afd-8f9b-9561709fffc0',
    incidents: []
  },
  {
    id: 'e81a914e-d9f6-424f-b579-a3fdb6a455d1',
    status: 'SUCCESS',
    head_branch: 'fix/ai-sprint-summary',
    event_actor: {
      username: 'shivam-bit',
      linked_user: null
    },
    created_at: '2023-08-24T19:30:07.202035+00:00',
    updated_at: '2023-11-01T14:20:33.454764+00:00',
    conducted_at: '2023-08-24T16:39:13+00:00',
    pr_count: 0,
    run_duration: 424,
    html_url:
      'https://github.com/monoclehq/web-manager-dash/actions/runs/5966498645',
    repo_workflow_id: '6415b349-1f49-4f97-96f9-dc5ac8eaf788',
    incidents: []
  },
  {
    id: 'ff9e7c9c-c5c8-4c10-a6af-c38ae1475752',
    status: 'SUCCESS',
    head_branch: 'fix/ai-sprint-summary',
    event_actor: {
      username: 'shivam-bit',
      linked_user: null
    },
    created_at: '2023-08-24T19:30:07.199529+00:00',
    updated_at: '2023-11-01T14:20:33.454764+00:00',
    conducted_at: '2023-08-24T17:25:42+00:00',
    pr_count: 0,
    run_duration: 434,
    html_url:
      'https://github.com/monoclehq/web-manager-dash/actions/runs/5966951664',
    repo_workflow_id: '6415b349-1f49-4f97-96f9-dc5ac8eaf788',
    incidents: []
  },
  {
    id: 'ac87cacc-790b-46fa-8b89-7c967a0527e3',
    status: 'SUCCESS',
    head_branch: 'master',
    event_actor: {
      username: 'samad-yar-khan',
      linked_user: null
    },
    created_at: '2023-08-25T01:30:06.720499+00:00',
    updated_at: '2023-11-01T14:35:30.590799+00:00',
    conducted_at: '2023-08-24T20:02:12+00:00',
    pr_count: 0,
    run_duration: 421,
    html_url: 'https://github.com/monoclehq/monorepo/actions/runs/5968348125',
    repo_workflow_id: '45a938c0-bfeb-4c0f-9b9b-c86c1575c440',
    incidents: []
  },
  {
    id: 'e38f6029-71d2-4b3b-8d95-74961c389400',
    status: 'SUCCESS',
    head_branch: 'main',
    event_actor: {
      username: 'jayantbh',
      linked_user: null
    },
    created_at: '2023-08-25T01:30:06.722765+00:00',
    updated_at: '2023-11-01T14:20:33.454764+00:00',
    conducted_at: '2023-08-24T23:11:14+00:00',
    pr_count: 0,
    run_duration: 429,
    html_url:
      'https://github.com/monoclehq/web-manager-dash/actions/runs/5969825410',
    repo_workflow_id: '6415b349-1f49-4f97-96f9-dc5ac8eaf788',
    incidents: []
  },
  {
    id: '7e8d8018-d100-4991-9435-04adfd0895bf',
    status: 'SUCCESS',
    head_branch: 'master',
    event_actor: {
      username: 'amoghjalan',
      linked_user: null
    },
    created_at: '2023-08-25T13:30:06.804844+00:00',
    updated_at: '2023-11-01T14:35:30.590799+00:00',
    conducted_at: '2023-08-25T08:24:16+00:00',
    pr_count: 0,
    run_duration: 112,
    html_url: 'https://github.com/monoclehq/monorepo/actions/runs/5973641522',
    repo_workflow_id: '45a938c0-bfeb-4c0f-9b9b-c86c1575c440',
    incidents: []
  },
  {
    id: 'a012823b-02b2-4780-bb1c-6ddc22db0df9',
    status: 'SUCCESS',
    head_branch: 'master',
    event_actor: {
      username: 'amoghjalan',
      linked_user: null
    },
    created_at: '2023-08-25T13:30:06.804693+00:00',
    updated_at: '2023-11-01T14:35:30.590799+00:00',
    conducted_at: '2023-08-25T08:24:23+00:00',
    pr_count: 0,
    run_duration: 427,
    html_url: 'https://github.com/monoclehq/monorepo/actions/runs/5973642430',
    repo_workflow_id: '45a938c0-bfeb-4c0f-9b9b-c86c1575c440',
    incidents: []
  },
  {
    id: '6c070aad-f293-42b7-9549-06d300f77a2f',
    status: 'SUCCESS',
    head_branch: 'master',
    event_actor: {
      username: 'amoghjalan',
      linked_user: null
    },
    created_at: '2023-08-25T13:30:06.804621+00:00',
    updated_at: '2023-11-01T14:35:30.590799+00:00',
    conducted_at: '2023-08-25T08:24:28+00:00',
    pr_count: 0,
    run_duration: 514,
    html_url: 'https://github.com/monoclehq/monorepo/actions/runs/5973643228',
    repo_workflow_id: '45a938c0-bfeb-4c0f-9b9b-c86c1575c440',
    incidents: []
  },
  {
    id: 'eeb53434-4a42-4b2c-86f8-644b3f6f1bc0',
    status: 'SUCCESS',
    head_branch: 'master',
    event_actor: {
      username: 'amoghjalan',
      linked_user: null
    },
    created_at: '2023-08-25T13:30:06.804539+00:00',
    updated_at: '2023-11-01T14:35:30.590799+00:00',
    conducted_at: '2023-08-25T08:39:18+00:00',
    pr_count: 0,
    run_duration: 95,
    html_url: 'https://github.com/monoclehq/monorepo/actions/runs/5973793722',
    repo_workflow_id: '45a938c0-bfeb-4c0f-9b9b-c86c1575c440',
    incidents: []
  },
  {
    id: '77f60298-a15f-4cdf-810b-11032446d813',
    status: 'SUCCESS',
    head_branch: 'master',
    event_actor: {
      username: 'amoghjalan',
      linked_user: null
    },
    created_at: '2023-08-25T13:30:06.804461+00:00',
    updated_at: '2023-11-01T14:35:30.590799+00:00',
    conducted_at: '2023-08-25T08:39:33+00:00',
    pr_count: 0,
    run_duration: 442,
    html_url: 'https://github.com/monoclehq/monorepo/actions/runs/5973795595',
    repo_workflow_id: '45a938c0-bfeb-4c0f-9b9b-c86c1575c440',
    incidents: []
  },
  {
    id: 'f836711c-e01a-488c-9da8-29b79164c545',
    status: 'SUCCESS',
    head_branch: 'master',
    event_actor: {
      username: 'amoghjalan',
      linked_user: null
    },
    created_at: '2023-08-25T13:30:06.804358+00:00',
    updated_at: '2023-11-01T14:35:30.590799+00:00',
    conducted_at: '2023-08-25T08:39:51+00:00',
    pr_count: 0,
    run_duration: 508,
    html_url: 'https://github.com/monoclehq/monorepo/actions/runs/5973798071',
    repo_workflow_id: '45a938c0-bfeb-4c0f-9b9b-c86c1575c440',
    incidents: []
  },
  {
    id: 'a010a51a-e08e-4649-a732-6c4f2a3c5566',
    status: 'SUCCESS',
    head_branch: 'master',
    event_actor: {
      username: 'amoghjalan',
      linked_user: null
    },
    created_at: '2023-08-25T13:30:06.801880+00:00',
    updated_at: '2023-11-01T14:35:30.590799+00:00',
    conducted_at: '2023-08-25T08:49:02+00:00',
    pr_count: 0,
    run_duration: 517,
    html_url: 'https://github.com/monoclehq/monorepo/actions/runs/5973875917',
    repo_workflow_id: '45a938c0-bfeb-4c0f-9b9b-c86c1575c440',
    incidents: []
  },
  {
    id: 'bbb14638-4f71-4a38-ad3a-0a3b2f649f83',
    status: 'SUCCESS',
    head_branch: 'main',
    event_actor: {
      username: 'abhayKumarVats',
      linked_user: null
    },
    created_at: '2023-08-25T13:30:07.146770+00:00',
    updated_at: '2023-11-01T14:20:33.454764+00:00',
    conducted_at: '2023-08-25T09:54:43+00:00',
    pr_count: 0,
    run_duration: 416,
    html_url:
      'https://github.com/monoclehq/web-manager-dash/actions/runs/5974486857',
    repo_workflow_id: '6415b349-1f49-4f97-96f9-dc5ac8eaf788',
    incidents: []
  },
  {
    id: '9df52ec2-8339-464f-a09a-effdcb289dd1',
    status: 'SUCCESS',
    head_branch: 'main',
    event_actor: {
      username: 'shivam-bit',
      linked_user: null
    },
    created_at: '2023-08-25T13:30:07.146617+00:00',
    updated_at: '2023-11-01T14:20:33.454764+00:00',
    conducted_at: '2023-08-25T10:18:45+00:00',
    pr_count: 0,
    run_duration: 347,
    html_url:
      'https://github.com/monoclehq/web-manager-dash/actions/runs/5974720326',
    repo_workflow_id: '6415b349-1f49-4f97-96f9-dc5ac8eaf788',
    incidents: []
  },
  {
    id: '8dfbb4f9-c876-4390-9eef-e3a77ebb8111',
    status: 'SUCCESS',
    head_branch: 'main',
    event_actor: {
      username: 'shivam-bit',
      linked_user: null
    },
    created_at: '2023-08-25T13:30:07.251727+00:00',
    updated_at: '2023-11-01T14:20:33.454764+00:00',
    conducted_at: '2023-08-25T10:18:50+00:00',
    pr_count: 0,
    run_duration: 360,
    html_url:
      'https://github.com/monoclehq/web-manager-dash/actions/runs/5974721129',
    repo_workflow_id: '9d790dd5-bcf8-4afd-8f9b-9561709fffc0',
    incidents: []
  },
  {
    id: '7e6a382d-44e4-42ba-ba8b-54a488137780',
    status: 'SUCCESS',
    head_branch: 'fix/board-filter-for-sp-chart',
    event_actor: {
      username: 'shivam-bit',
      linked_user: null
    },
    created_at: '2023-08-25T13:30:07.249281+00:00',
    updated_at: '2023-11-01T14:20:33.454764+00:00',
    conducted_at: '2023-08-25T11:43:22+00:00',
    pr_count: 0,
    run_duration: 443,
    html_url:
      'https://github.com/monoclehq/web-manager-dash/actions/runs/5975461200',
    repo_workflow_id: '9d790dd5-bcf8-4afd-8f9b-9561709fffc0',
    incidents: []
  },
  {
    id: '30885727-fddb-45f3-b45b-11e8922ff430',
    status: 'SUCCESS',
    head_branch: 'fix/board-filter-for-sp-chart',
    event_actor: {
      username: 'shivam-bit',
      linked_user: null
    },
    created_at: '2023-08-25T13:30:07.146515+00:00',
    updated_at: '2023-11-01T14:20:33.454764+00:00',
    conducted_at: '2023-08-25T11:47:07+00:00',
    pr_count: 0,
    run_duration: 475,
    html_url:
      'https://github.com/monoclehq/web-manager-dash/actions/runs/5975489626',
    repo_workflow_id: '6415b349-1f49-4f97-96f9-dc5ac8eaf788',
    incidents: []
  },
  {
    id: '537a0419-568b-43ac-b575-be7cde598b16',
    status: 'SUCCESS',
    head_branch: 'main',
    event_actor: {
      username: 'abhayKumarVats',
      linked_user: null
    },
    created_at: '2023-08-25T13:30:07.143438+00:00',
    updated_at: '2023-11-01T14:20:33.454764+00:00',
    conducted_at: '2023-08-25T13:16:37+00:00',
    pr_count: 0,
    run_duration: 432,
    html_url:
      'https://github.com/monoclehq/web-manager-dash/actions/runs/5976380841',
    repo_workflow_id: '6415b349-1f49-4f97-96f9-dc5ac8eaf788',
    incidents: []
  },
  {
    id: '393eaae6-d2e2-4cb7-958b-b3c64c5960a8',
    status: 'SUCCESS',
    head_branch: 'master',
    event_actor: {
      username: 'amoghjalan',
      linked_user: null
    },
    created_at: '2023-08-28T12:20:27.360967+00:00',
    updated_at: '2023-11-01T14:35:30.590799+00:00',
    conducted_at: '2023-08-28T08:21:11+00:00',
    pr_count: 0,
    run_duration: 94,
    html_url: 'https://github.com/monoclehq/monorepo/actions/runs/5997431868',
    repo_workflow_id: '45a938c0-bfeb-4c0f-9b9b-c86c1575c440',
    incidents: []
  },
  {
    id: 'e1fb21d6-8906-48f4-ab6a-cff59f02ee27',
    status: 'SUCCESS',
    head_branch: 'master',
    event_actor: {
      username: 'amoghjalan',
      linked_user: null
    },
    created_at: '2023-08-28T12:20:27.360882+00:00',
    updated_at: '2023-11-01T14:35:30.590799+00:00',
    conducted_at: '2023-08-28T08:21:20+00:00',
    pr_count: 0,
    run_duration: 419,
    html_url: 'https://github.com/monoclehq/monorepo/actions/runs/5997433129',
    repo_workflow_id: '45a938c0-bfeb-4c0f-9b9b-c86c1575c440',
    incidents: []
  },
  {
    id: '102b426b-03fa-4f33-bcc6-75e7089157fe',
    status: 'SUCCESS',
    head_branch: 'master',
    event_actor: {
      username: 'amoghjalan',
      linked_user: null
    },
    created_at: '2023-08-28T12:20:27.360802+00:00',
    updated_at: '2023-11-01T14:35:30.590799+00:00',
    conducted_at: '2023-08-28T08:21:26+00:00',
    pr_count: 0,
    run_duration: 516,
    html_url: 'https://github.com/monoclehq/monorepo/actions/runs/5997433971',
    repo_workflow_id: '45a938c0-bfeb-4c0f-9b9b-c86c1575c440',
    incidents: []
  },
  {
    id: '17399bb1-b14e-4ec5-a6c5-a02b9d040352',
    status: 'SUCCESS',
    head_branch: 'master',
    event_actor: {
      username: 'amoghjalan',
      linked_user: null
    },
    created_at: '2023-08-28T12:20:27.360698+00:00',
    updated_at: '2023-11-01T14:35:30.590799+00:00',
    conducted_at: '2023-08-28T09:35:28+00:00',
    pr_count: 0,
    run_duration: 123,
    html_url: 'https://github.com/monoclehq/monorepo/actions/runs/5998189375',
    repo_workflow_id: '45a938c0-bfeb-4c0f-9b9b-c86c1575c440',
    incidents: []
  },
  {
    id: '6e8cc8c2-b02a-4df3-8f9f-bcb9c2da9b14',
    status: 'SUCCESS',
    head_branch: 'master',
    event_actor: {
      username: 'amoghjalan',
      linked_user: null
    },
    created_at: '2023-08-28T12:20:27.358073+00:00',
    updated_at: '2023-11-01T14:35:30.590799+00:00',
    conducted_at: '2023-08-28T09:35:34+00:00',
    pr_count: 0,
    run_duration: 101,
    html_url: 'https://github.com/monoclehq/monorepo/actions/runs/5998190099',
    repo_workflow_id: '45a938c0-bfeb-4c0f-9b9b-c86c1575c440',
    incidents: []
  },
  {
    id: 'ed6ac659-dda0-49d5-81bb-c32a1c33f3ff',
    status: 'SUCCESS',
    head_branch: 'master',
    event_actor: {
      username: 'amoghjalan',
      linked_user: null
    },
    created_at: '2023-08-28T16:16:07.948659+00:00',
    updated_at: '2023-11-01T14:35:30.590799+00:00',
    conducted_at: '2023-08-28T14:06:39+00:00',
    pr_count: 0,
    run_duration: 98,
    html_url: 'https://github.com/monoclehq/monorepo/actions/runs/6000896890',
    repo_workflow_id: '45a938c0-bfeb-4c0f-9b9b-c86c1575c440',
    incidents: []
  },
  {
    id: '0914cecd-22be-470d-a1b3-95dfe2937e09',
    status: 'SUCCESS',
    head_branch: 'master',
    event_actor: {
      username: 'amoghjalan',
      linked_user: null
    },
    created_at: '2023-08-28T16:16:07.948586+00:00',
    updated_at: '2023-11-01T14:35:30.590799+00:00',
    conducted_at: '2023-08-28T14:06:46+00:00',
    pr_count: 0,
    run_duration: 442,
    html_url: 'https://github.com/monoclehq/monorepo/actions/runs/6000898094',
    repo_workflow_id: '45a938c0-bfeb-4c0f-9b9b-c86c1575c440',
    incidents: []
  },
  {
    id: '3f7c40da-dbf4-4d8d-9fb8-371a3769193a',
    status: 'SUCCESS',
    head_branch: 'migrate-github-idempotency',
    event_actor: {
      username: 'amoghjalan',
      linked_user: null
    },
    created_at: '2023-08-28T16:16:07.948504+00:00',
    updated_at: '2023-11-01T14:35:30.590799+00:00',
    conducted_at: '2023-08-28T14:16:03+00:00',
    pr_count: 0,
    run_duration: 95,
    html_url: 'https://github.com/monoclehq/monorepo/actions/runs/6001016083',
    repo_workflow_id: '45a938c0-bfeb-4c0f-9b9b-c86c1575c440',
    incidents: []
  },
  {
    id: 'b4b6b538-8e26-4b5b-93a4-84686e8e8679',
    status: 'SUCCESS',
    head_branch: 'migrate-github-idempotency',
    event_actor: {
      username: 'amoghjalan',
      linked_user: null
    },
    created_at: '2023-08-28T16:16:07.948420+00:00',
    updated_at: '2023-11-01T14:35:30.590799+00:00',
    conducted_at: '2023-08-28T14:16:12+00:00',
    pr_count: 0,
    run_duration: 445,
    html_url: 'https://github.com/monoclehq/monorepo/actions/runs/6001018399',
    repo_workflow_id: '45a938c0-bfeb-4c0f-9b9b-c86c1575c440',
    incidents: []
  },
  {
    id: '21acca2a-07a6-47b2-a069-be6d64a9ff78',
    status: 'SUCCESS',
    head_branch: 'main',
    event_actor: {
      username: 'shivam-bit',
      linked_user: null
    },
    created_at: '2023-08-28T16:16:07.850451+00:00',
    updated_at: '2023-11-01T14:20:33.454764+00:00',
    conducted_at: '2023-08-28T14:20:49+00:00',
    pr_count: 0,
    run_duration: 434,
    html_url:
      'https://github.com/monoclehq/web-manager-dash/actions/runs/6001075968',
    repo_workflow_id: '6415b349-1f49-4f97-96f9-dc5ac8eaf788',
    incidents: []
  },
  {
    id: '2c0522cc-de44-49e2-aeae-068020feb129',
    status: 'SUCCESS',
    head_branch: 'migrate-github-idempotency',
    event_actor: {
      username: 'amoghjalan',
      linked_user: null
    },
    created_at: '2023-08-28T16:16:07.948340+00:00',
    updated_at: '2023-11-01T14:35:30.590799+00:00',
    conducted_at: '2023-08-28T14:29:50+00:00',
    pr_count: 0,
    run_duration: 97,
    html_url: 'https://github.com/monoclehq/monorepo/actions/runs/6001180005',
    repo_workflow_id: '45a938c0-bfeb-4c0f-9b9b-c86c1575c440',
    incidents: []
  },
  {
    id: 'e28f7393-e38c-4d85-aea1-f3243daf21a6',
    status: 'SUCCESS',
    head_branch: 'master',
    event_actor: {
      username: 'amoghjalan',
      linked_user: null
    },
    created_at: '2023-08-28T16:16:07.948268+00:00',
    updated_at: '2023-11-01T14:35:30.590799+00:00',
    conducted_at: '2023-08-28T14:47:52+00:00',
    pr_count: 0,
    run_duration: 105,
    html_url: 'https://github.com/monoclehq/monorepo/actions/runs/6001372010',
    repo_workflow_id: '45a938c0-bfeb-4c0f-9b9b-c86c1575c440',
    incidents: []
  },
  {
    id: '92ae962f-c85b-458e-b9c9-c29ed5425a96',
    status: 'SUCCESS',
    head_branch: 'master',
    event_actor: {
      username: 'amoghjalan',
      linked_user: null
    },
    created_at: '2023-08-28T16:16:07.948195+00:00',
    updated_at: '2023-11-01T14:35:30.590799+00:00',
    conducted_at: '2023-08-28T14:47:59+00:00',
    pr_count: 0,
    run_duration: 420,
    html_url: 'https://github.com/monoclehq/monorepo/actions/runs/6001372847',
    repo_workflow_id: '45a938c0-bfeb-4c0f-9b9b-c86c1575c440',
    incidents: []
  },
  {
    id: 'c40dfc82-6c73-4c21-9682-fd78ae7a49dc',
    status: 'SUCCESS',
    head_branch: 'master',
    event_actor: {
      username: 'amoghjalan',
      linked_user: null
    },
    created_at: '2023-08-28T16:16:07.948106+00:00',
    updated_at: '2023-11-01T14:35:30.590799+00:00',
    conducted_at: '2023-08-28T14:48:04+00:00',
    pr_count: 0,
    run_duration: 541,
    html_url: 'https://github.com/monoclehq/monorepo/actions/runs/6001373626',
    repo_workflow_id: '45a938c0-bfeb-4c0f-9b9b-c86c1575c440',
    incidents: []
  },
  {
    id: 'e5f3d1e4-a367-49a3-995a-791db9d28732',
    status: 'SUCCESS',
    head_branch: 'master',
    event_actor: {
      username: 'amoghjalan',
      linked_user: null
    },
    created_at: '2023-08-28T16:16:07.948017+00:00',
    updated_at: '2023-11-01T14:35:30.590799+00:00',
    conducted_at: '2023-08-28T14:57:42+00:00',
    pr_count: 0,
    run_duration: 437,
    html_url: 'https://github.com/monoclehq/monorepo/actions/runs/6001469940',
    repo_workflow_id: '45a938c0-bfeb-4c0f-9b9b-c86c1575c440',
    incidents: []
  },
  {
    id: '289c88ad-59ff-4727-bdf1-a6864ea67e8c',
    status: 'SUCCESS',
    head_branch: 'master',
    event_actor: {
      username: 'amoghjalan',
      linked_user: null
    },
    created_at: '2023-08-28T16:16:07.945597+00:00',
    updated_at: '2023-11-01T14:35:30.590799+00:00',
    conducted_at: '2023-08-28T14:57:58+00:00',
    pr_count: 0,
    run_duration: 542,
    html_url: 'https://github.com/monoclehq/monorepo/actions/runs/6001472573',
    repo_workflow_id: '45a938c0-bfeb-4c0f-9b9b-c86c1575c440',
    incidents: []
  },
  {
    id: 'd3bfc358-81ce-4274-bfaf-840de13a32a9',
    status: 'SUCCESS',
    head_branch: 'fix/github-repo-sync',
    event_actor: {
      username: 'shivam-bit',
      linked_user: null
    },
    created_at: '2023-08-28T19:30:10.184818+00:00',
    updated_at: '2023-11-01T14:20:33.454764+00:00',
    conducted_at: '2023-08-28T16:37:56+00:00',
    pr_count: 0,
    run_duration: 354,
    html_url:
      'https://github.com/monoclehq/web-manager-dash/actions/runs/6002511279',
    repo_workflow_id: '6415b349-1f49-4f97-96f9-dc5ac8eaf788',
    incidents: []
  },
  {
    id: '1bbacf44-2013-4873-b82a-79aa146f1b67',
    status: 'SUCCESS',
    head_branch: 'main',
    event_actor: {
      username: 'shivam-bit',
      linked_user: null
    },
    created_at: '2023-08-29T07:30:10.881427+00:00',
    updated_at: '2023-11-01T14:20:33.454764+00:00',
    conducted_at: '2023-08-29T05:27:54+00:00',
    pr_count: 0,
    run_duration: 340,
    html_url:
      'https://github.com/monoclehq/web-manager-dash/actions/runs/6008299876',
    repo_workflow_id: '6415b349-1f49-4f97-96f9-dc5ac8eaf788',
    incidents: []
  }
].map(
  (deployment) =>
    ({
      ...deployment,
      incidents: deployment.incidents.map(
        (incident) =>
          ({
            ...incident,
            title: faker.lorem.sentence(),
            summary: faker.lorem.paragraphs(2)
          }) as Incident
      )
    }) as DeploymentWithIncidents
);

export const mockDeploymentsWithIncidents: IncidentApiResponseType = {
  deployments_with_incidents,
  revert_prs: revertPrsMock,
  summary_prs: summaryPrsMock
};
