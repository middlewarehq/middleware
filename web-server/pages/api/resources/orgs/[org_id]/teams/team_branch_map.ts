import * as yup from 'yup';

import {
  getAllTeamsReposProdBranchesForOrg,
  transformTeamRepoBranchesToMap
} from '@/api/internal/team/[team_id]/repo_branches';
import { Endpoint } from '@/api-helpers/global';
import { getTeamV2Mock } from '@/mocks/teams';

const getSchema = yup.object().shape({});

const pathnameSchema = yup.object().shape({
  org_id: yup.string().uuid().required()
});

const endpoint = new Endpoint(pathnameSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send(getTeamV2Mock['teamReposProdBranchMap']);
  }

  const { org_id } = req.payload;

  const teamsReposProductionBranchDetails =
    await getAllTeamsReposProdBranchesForOrg(org_id);

  const teamReposProdBranchMap = transformTeamRepoBranchesToMap(
    teamsReposProductionBranchDetails
  );

  res.send({ teamReposProdBranchMap });
});

export default endpoint.serve();
