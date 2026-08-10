import * as yup from 'yup';

import { Endpoint } from '@/api-helpers/global';
import { internal } from '@/api-helpers/axios';

// CLUSTOX: backs the contributor filter on the DORA metrics page. team_id is
// validated by Endpoint.serve(), which asserts the caller may read that team.
const pathSchema = yup.object().shape({
  team_id: yup.string().uuid().required()
});

const getSchema = yup.object().shape({
  team_id: yup.string().uuid().required(),
  from_date: yup.date().required(),
  to_date: yup.date().required()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  const { team_id, from_date, to_date } = req.payload;

  const contributors = await internal.get(`/teams/${team_id}/contributors`, {
    params: { from_time: from_date, to_time: to_date }
  });

  res.send(contributors.data);
});

export default endpoint.serve();
