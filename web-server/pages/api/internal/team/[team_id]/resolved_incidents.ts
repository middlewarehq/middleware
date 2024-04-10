import { endOfDay, nextSunday, previousMonday, startOfDay } from 'date-fns';
import { isNil, reject } from 'ramda';
import * as yup from 'yup';

import { handleRequest } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';
import { mockResolvedIncidents } from '@/mocks/resolved-incidents';
import { IncidentsWithDeploymentResponseType } from '@/types/resources';
import { isoDateString } from '@/utils/date';

const pathSchema = yup.object().shape({
  team_id: yup.string().uuid().required()
});

const getSchema = yup.object().shape({
  from_date: yup.date().required(),
  to_date: yup.date().required()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) return res.send(mockResolvedIncidents);

  const { team_id, from_date, to_date } = req.payload;
  return res.send(
    await getTeamResolvedIncidents({ team_id, from_date, to_date })
  );
});

export const getTeamResolvedIncidents = async (params: {
  team_id: ID;
  from_date: DateString | Date;
  to_date: DateString | Date;
}) => {
  return handleRequest<IncidentsWithDeploymentResponseType[]>(
    `/teams/${params.team_id}/resolved_incidents`,
    {
      params: reject(isNil, {
        from_time: isoDateString(
          startOfDay(previousMonday(new Date(params.from_date)))
        ),
        to_time: isoDateString(endOfDay(nextSunday(new Date(params.to_date))))
      })
    }
  );
};

export default endpoint.serve();
