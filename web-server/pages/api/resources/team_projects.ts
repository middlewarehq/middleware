import * as yup from 'yup';

import { handleRequest } from '@/api-helpers/axios';
import { Endpoint, nullSchema } from '@/api-helpers/global';
import { Row } from '@/constants/db';

// CLUSTOX: Jira integration, Phase 2 (project selection) -- a team's
// selected Jira project(s). Deliberately its own standalone resource
// (mirrors team_repos.ts's shape, not wired into teams/v2.ts's combined
// create/update-team request) rather than folded into the existing
// team-repos save flow: project selection has none of repos' deployment
// type/workflow concerns, and keeping it separate means this can't
// regress the already-working repo-selection flow. See
// docs/JIRA_INTEGRATION_PROPOSAL.md.
export type TeamProject = Row<'TeamProjects'> & Row<'OrgProject'>;

const getSchema = yup.object().shape({
  team_id: yup.string().uuid().required()
});

const putSchema = yup.object().shape({
  team_id: yup.string().uuid().required(),
  projects: yup
    .array()
    .of(
      yup.object().shape({
        key: yup.string().required(),
        name: yup.string().required(),
        provider: yup.string().required(),
        idempotency_key: yup.string().required()
      })
    )
    .required()
});

const endpoint = new Endpoint(nullSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  res.send(await getTeamProjects(req.payload.team_id));
});

export const getTeamProjects = (team_id: ID) =>
  handleRequest<TeamProject[]>(`/teams/${team_id}/projects`).then((projects) =>
    projects.map((p) => ({ ...p, team_id }))
  );

endpoint.handle.PUT(putSchema, async (req, res) => {
  const { team_id, projects } = req.payload;

  const updated = await handleRequest<TeamProject[]>(
    `/teams/${team_id}/projects`,
    {
      method: 'PUT',
      data: {
        projects: projects.map((project) => ({ ...project, team_id }))
      }
    }
  );

  res.send(updated.map((p) => ({ ...p, team_id })));
});

export default endpoint.serve();
