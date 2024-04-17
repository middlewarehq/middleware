import { descend, mapObjIndexed, prop, sort } from 'ramda';

import {
  Deployment,
  UpdatedDeployment,
  UpdatedTeamDeploymentsApiResponse
} from '@/types/resources';

export function adaptDeploymentsMap(curr: UpdatedDeployment): Deployment {
  return {
    id: curr.id,
    status: curr.status,
    head_branch: curr.head_branch,
    event_actor: {
      username: curr.event_actor.username,
      linked_user: curr.event_actor.linked_user
    },
    created_at: '',
    updated_at: '',
    conducted_at: curr.conducted_at,
    pr_count: curr.pr_count,
    html_url: curr.html_url,
    repo_workflow_id: curr.meta.repo_workflow_id,
    run_duration: curr.duration
  };
}

export const adaptedDeploymentsMap = (
  deploymentsMap: UpdatedTeamDeploymentsApiResponse['deployments_map']
) => {
  const x = Object.entries(deploymentsMap).map(([key, value]) => {
    return [key, value.map(adaptDeploymentsMap)];
  });
  const adaptedDeployments: Record<string, Deployment[]> =
    Object.fromEntries(x);

  return mapObjIndexed(sort(descend(prop('conducted_at'))), adaptedDeployments);
};
