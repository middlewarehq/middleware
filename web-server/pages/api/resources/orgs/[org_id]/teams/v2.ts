import {
  groupBy as ramdaGroupBy,
  prop,
  mapObjIndexed,
  forEachObjIndexed
} from 'ramda';
import * as yup from 'yup';

import { getSelectedReposForOrg } from '@/api/integrations/selected';
import { syncReposForOrg } from '@/api/internal/[org_id]/sync_repos';
import {
  getOnBoardingState,
  updateOnBoardingState
} from '@/api/resources/orgs/[org_id]/onboarding';
import { handleRequest } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';
import { Row, Table } from '@/constants/db';
import {
  CIProvider,
  Integration,
  WorkflowType
} from '@/constants/integrations';
import { getTeamV2Mock } from '@/mocks/teams';
import { BaseTeam } from '@/types/api/teams';
import { OnboardingStep, ReqRepoWithProvider } from '@/types/resources';
import { db, getFirstRow } from '@/utils/db';
import groupBy from '@/utils/objectArray';

const repoSchema = yup.object().shape({
  idempotency_key: yup.string().required(),
  deployment_type: yup.string().required(),
  provider: yup.string().oneOf(Object.values(Integration)).required(),
  slug: yup.string().required(),
  name: yup.string().required(),
  repo_workflows: yup.array().of(
    yup.object().shape({
      name: yup.string().required(),
      value: yup.string().required()
    })
  )
});

const getSchema = yup.object().shape({
  providers: yup.array(
    yup.string().oneOf(Object.values(Integration)).required()
  )
});

const postSchema = yup.object().shape({
  name: yup.string().required(),
  org_repos: yup.lazy((obj) =>
    yup.object(mapObjIndexed(() => yup.array().of(repoSchema), obj))
  )
});

const patchSchema = yup.object().shape({
  id: yup.string().uuid().required(),
  name: yup.string().nullable().optional(),
  org_repos: yup.lazy((obj) =>
    yup.object(mapObjIndexed(() => yup.array().of(repoSchema), obj))
  )
});

const deleteSchema = yup.object().shape({
  id: yup.string().uuid().required()
});

const pathnameSchema = yup.object().shape({
  org_id: yup.string().uuid().required()
});

const endpoint = new Endpoint(pathnameSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send(getTeamV2Mock);
  }

  const { org_id, providers } = req.payload;
  const getQuery = db('Team')
    .select('*')
    .where('org_id', org_id)
    .andWhereNot('is_deleted', true)
    .orderBy('name', 'asc');

  const teams = await getQuery;
  const reposWithWorkflows = await getSelectedReposForOrg(
    org_id,
    providers as Integration[]
  ).then((res) => res.flat());

  res.send({
    teams: teams,
    teamReposMap: ramdaGroupBy(prop('team_id'), reposWithWorkflows),
    reposWithWorkflows
  });
});

endpoint.handle.POST(postSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send(getTeamV2Mock);
  }

  const { org_repos, org_id, name } = req.payload;
  const orgReposList: ReqRepoWithProvider[] = [];
  forEachObjIndexed((repos, org) => {
    repos.forEach((repo) => {
      orgReposList.push({
        ...repo,
        org,
        provider: repo.provider
      } as any as ReqRepoWithProvider);
    });
  }, org_repos);
  const [team, onboardingState] = await Promise.all([
    createTeam(org_id, name, []),
    getOnBoardingState(org_id)
  ]);

  const updatedOnboardingState = Array.from(
    new Set(onboardingState.onboarding_state).add(OnboardingStep.TEAM_CREATED)
  );
  await handleRequest<(Row<'TeamRepos'> & Row<'OrgRepo'>)[]>(
    `/teams/${team.id}/repos`,
    {
      method: 'PUT',
      data: {
        repos: orgReposList
      }
    }
  );

  const providers = Array.from(new Set(orgReposList.map((r) => r.provider)));
  await updateReposWorkflows(org_id, orgReposList);
  const reposWithWorkflows = await getSelectedReposForOrg(
    org_id,
    providers as Integration[]
  );
  updateOnBoardingState(org_id, updatedOnboardingState);
  syncReposForOrg();

  res.send({
    team,
    teamReposMap: ramdaGroupBy(prop('team_id'), reposWithWorkflows)
  });
});

endpoint.handle.PATCH(patchSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send(getTeamV2Mock);
  }

  const { org_id, id, name, org_repos } = req.payload;
  const orgReposList: ReqRepoWithProvider[] = [];
  forEachObjIndexed((repos, org) => {
    repos.forEach((repo) => {
      orgReposList.push({
        ...repo,
        org,
        provider: repo.provider
      } as any as ReqRepoWithProvider);
    });
  }, org_repos);

  const [team] = await Promise.all([
    updateTeam(id, name, []),
    handleRequest<(Row<'TeamRepos'> & Row<'OrgRepo'>)[]>(`/teams/${id}/repos`, {
      method: 'PUT',
      data: {
        repos: orgReposList
      }
    }).then((repos) => repos.map((r) => ({ ...r, team_id: id })))
  ]);
  await updateReposWorkflows(org_id, orgReposList);

  const providers = Array.from(new Set(orgReposList.map((r) => r.provider)));

  const reposWithWorkflows = await getSelectedReposForOrg(
    org_id,
    providers as Integration[]
  );
  syncReposForOrg();
  res.send({
    team,
    teamReposMap: ramdaGroupBy(prop('team_id'), reposWithWorkflows)
  });
});

endpoint.handle.DELETE(deleteSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send(getTeamV2Mock);
  }

  const data = await db('Team')
    .update('is_deleted', true)
    .where('id', req.payload.id)
    .orderBy('name', 'asc')
    .returning('*')
    .then(getFirstRow);

  res.send(data);
});

export default endpoint.serve();

const updateTeam = async (
  team_id: ID,
  team_name: string,
  member_ids: string[]
): Promise<BaseTeam> => {
  return handleRequest<BaseTeam>(`/team/${team_id}`, {
    method: 'PATCH',
    data: {
      name: team_name,
      member_ids
    }
  });
};

const createTeam = async (
  org_id: ID,
  team_name: string,
  member_ids: string[]
): Promise<BaseTeam> => {
  return handleRequest<BaseTeam>(`/org/${org_id}/team`, {
    method: 'POST',
    data: {
      name: team_name,
      member_ids
    }
  });
};

const updateReposWorkflows = async (
  org_id: ID,
  orgReposList: ReqRepoWithProvider[]
) => {
  const repoWorkflows = orgReposList.reduce(
    (prev, curr) => ({
      ...prev,
      [curr.name]:
        curr.repo_workflows?.map((w) => ({
          value: String(w.value),
          name: w.name,
          provider: curr.provider
        })) || []
    }),
    {} as Record<
      string,
      { name: string; value: string; provider: Integration }[]
    >
  );

  const reposForWorkflows = Object.keys(repoWorkflows);

  if (reposForWorkflows.length) {
    // Step 1: Get all repos for the workflows
    const dbReposForWorkflows = await db(Table.OrgRepo)
      .select('*')
      .whereIn('name', reposForWorkflows)
      .where('org_id', org_id)
      .andWhere('is_active', true)
      .and.whereIn('provider', [Integration.GITHUB, Integration.GITLAB]);

    const groupedRepos = groupBy(dbReposForWorkflows, 'name');

    // Step 2: Disable all workflows for the above db repos
    await db('RepoWorkflow')
      .update('is_active', false)
      .whereIn(
        'org_repo_id',
        dbReposForWorkflows.map((r) => r.id)
      )
      .andWhere('type', WorkflowType.DEPLOYMENT);

    const newWorkflows = Object.entries(repoWorkflows)
      .filter(([repoName]) => groupedRepos[repoName]?.id)
      .flatMap(([repoName, workflows]) =>
        workflows.map((workflow) => ({
          is_active: true,
          name: workflow.name,
          provider:
            workflow.provider === Integration.GITHUB
              ? CIProvider.GITHUB_ACTIONS
              : workflow.provider === Integration.BITBUCKET
              ? CIProvider.CIRCLE_CI
              : null,
          provider_workflow_id: String(workflow.value),
          type: WorkflowType.DEPLOYMENT,
          org_repo_id: groupedRepos[repoName]?.id
        }))
      );

    if (newWorkflows.length) {
      await db('RepoWorkflow')
        .insert(newWorkflows)
        .onConflict(['org_repo_id', 'provider_workflow_id'])
        .merge()
        .returning('*');
    }
  }
};
