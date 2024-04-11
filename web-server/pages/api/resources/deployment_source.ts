import * as yup from 'yup';

import { Endpoint, nullSchema } from '@/api-helpers/global';
import { Columns, Row, Table } from '@/constants/db';
import { teamReposMock } from '@/mocks/repos';
import { DeploymentSources } from '@/types/resources';
import { db } from '@/utils/db';

const getSchema = yup.object().shape({
  team_id: yup.string().uuid().required()
});

const patchSchema = yup.object().shape({
  team_id: yup.string().uuid().required(),
  repo_id: yup.string().uuid().optional(),
  deployment_type: yup.string().oneOf(Object.values(DeploymentSources))
});

const endpoint = new Endpoint(nullSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send(teamReposMock);
  }

  res.send(await getTeamDeploymentType(req.payload.team_id));
});

const getTeamDeploymentType = (team_id: ID) =>
  (team_id
    ? db('TeamRepos')
        .select(
          'TeamRepos.team_id',
          'TeamRepos.is_active',
          'TeamRepos.deployment_type',
          'OrgRepo.name',
          'OrgRepo.id'
        )
        .leftJoin('OrgRepo', 'OrgRepo.id', 'TeamRepos.org_repo_id')
        .where('TeamRepos.is_active', true)
        .andWhere('TeamRepos.team_id', team_id)
        .orderBy('name', 'asc')
    : []) as any as Promise<(Row<'TeamRepos'> & Row<'OrgRepo'>)[]>;

endpoint.handle.PATCH(patchSchema, async (req, res) => {
  const { deployment_type, team_id, repo_id } = req.payload;

  if (repo_id) {
    await db(Table.TeamRepos)
      .update({
        [Columns[Table.TeamRepos].deployment_type]: deployment_type,
        updated_at: new Date()
      })
      .where('team_id', team_id)
      .andWhere('org_repo_id', repo_id);

    res.status(200).send({
      message: 'Updated single repo deployment type',
      repo_id,
      deployment_type
    });
  } else {
    await db(Table.TeamRepos)
      .update({
        [Columns[Table.TeamRepos].deployment_type]: deployment_type,
        updated_at: new Date()
      })
      .where('team_id', team_id);

    res.status(200).send({
      message: 'Updated all repos deployment type',
      deployment_type
    });
  }
});

export default endpoint.serve();
