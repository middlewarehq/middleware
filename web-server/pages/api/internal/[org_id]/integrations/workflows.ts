import * as yup from 'yup';

import { handleRequest } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';
import { CIProvider, Integration } from '@/constants/integrations';
import { RepoWorkflowResponse, RepoWorkflow } from '@/types/resources';

const pathSchema = yup.object().shape({
  org_id: yup.string().uuid().required()
});

const getSchema = yup.object().shape({
  provider: yup.string().oneOf(Object.values(Integration)),
  org_name: yup.string().required(),
  repo_name: yup.string().required(),
  repo_slug: yup.string().required()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  const { org_id, provider, org_name, repo_name, repo_slug, next_page_token } =
    req.payload;

  const githubActionWorkflowsPromise =
    provider === Integration.GITHUB
      ? handleRequest<RepoWorkflow[]>(
          `/orgs/${org_id}/integrations/${provider}/${org_name}/${repo_name}/workflows`
        ).then((workflows) =>
          adaptWorkflows(workflows, CIProvider.GITHUB_ACTIONS)
        )
      : Promise.resolve([]);

  let params: { repo_slug: string; page_token?: string } = {
    repo_slug: repo_slug
  };

  if (next_page_token || next_page_token === null)
    params['page_token'] = next_page_token;

  const [githubActionWorkflows, circleciWorkflows] = await Promise.all([
    githubActionWorkflowsPromise,
    handleRequest<RepoWorkflowResponse>(
      `/orgs/${org_id}/integrations/circleci/${provider}/${org_name}/${repo_name}/workflows`,
      { params }
    )
      .then((workflows) => ({
        workflows: adaptWorkflows(workflows.workflows, CIProvider.CIRCLE_CI),
        next_page_token: workflows.next_page_token
      }))
      .catch(() => ({ workflows: [], next_page_token: null }))
  ]);
  return res.send({
    workflows: [...githubActionWorkflows, ...circleciWorkflows.workflows],
    next_page_token: circleciWorkflows.next_page_token
  });
});

const adaptWorkflows = (
  repoWorkflows: RepoWorkflow[],
  ciProvider: CIProvider
) => {
  return repoWorkflows.map((workflows) => ({
    ...workflows,
    ci_provider: ciProvider
  }));
};

export default endpoint.serve();
