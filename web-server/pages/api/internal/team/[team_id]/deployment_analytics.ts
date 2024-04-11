import { descend, isNil, mapObjIndexed, prop, reject, sort } from 'ramda';
import * as yup from 'yup';

import { handleRequest } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';
import { mockDeploymentFreq } from '@/mocks/deployment-freq';
import { TeamDeploymentsApiResponse } from '@/types/resources';
import { isoDateString } from '@/utils/date';

const pathSchema = yup.object().shape({
  team_id: yup.string().uuid().required()
});

const getSchema = yup.object().shape({
  from_date: yup.date().required(),
  to_date: yup.date().required(),
  branches: yup.string().optional().nullable()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) return res.send(mockDeploymentFreq);

  const { team_id, branches, from_date, to_date } = req.payload;
  return res.send(
    await handleRequest<TeamDeploymentsApiResponse>(
      `/v2/teams/${team_id}/deployment_analytics`,
      {
        params: reject(isNil, {
          branches,
          from_time: isoDateString(new Date(from_date)),
          to_time: isoDateString(new Date(to_date))
        })
      }
    ).then((r) => ({
      ...r,
      deployments_map: mapObjIndexed(
        sort(descend(prop('conducted_at'))),
        r.deployments_map
      )
    }))
  );
});

export default endpoint.serve();
