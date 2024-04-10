import * as yup from 'yup';

import { handleRequest } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';
import { getUserIdFromReq } from '@/api-helpers/user';
import { FetchTeamSettingsAPIResponse } from '@/types/resources';

const pathSchema = yup.object().shape({
  team_id: yup.string().uuid().required()
});
const putSchema = yup.object().shape({
  setting_type: yup.string().required(),
  setting_data: yup.object()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.PUT(putSchema, async (req, res) => {
  const { team_id, setting_data, setting_type } = req.payload;
  const setter_id = getUserIdFromReq(req);
  return res.send(
    await handleRequest<FetchTeamSettingsAPIResponse>(
      `/teams/${team_id}/settings`,
      {
        method: 'PUT',
        data: {
          setting_type,
          setter_id,
          setting_data
        }
      }
    )
  );
});

export default endpoint.serve();
