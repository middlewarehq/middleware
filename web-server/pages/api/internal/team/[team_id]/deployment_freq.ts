import { handleRequest } from '@/api-helpers/axios';
import {
  TeamDeploymentsConfigured,
  RepoWithSingleWorkflow
} from '@/types/resources';

export const fetchWorkflowConfiguredRepos = async (team_id: ID) => {
  const [assignedReposConfig, workflowConfiguration] = await Promise.all([
    handleRequest<{
      repos_included: RepoWithSingleWorkflow[];
      all_team_repos: RepoWithSingleWorkflow[];
    }>(`/teams/${team_id}/lead_time/repos`).catch((e) => {
      console.error(e);
      return {
        repos_included: [],
        all_team_repos: []
      };
    }),
    handleRequest<TeamDeploymentsConfigured>(
      `/teams/${team_id}/deployments_configured`
    )
  ]);
  return {
    ...assignedReposConfig,
    ...workflowConfiguration
  };
};
