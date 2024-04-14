import * as yup from 'yup';

import { handleRequest } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';
import { FetchTeamSettingsAPIResponse } from '@/types/resources';

const pathSchema = yup.object().shape({
  team_id: yup.string().uuid().required()
});
const getSchema = yup.object().shape({
  setting_type: yup.string().required()
});

const putSchema = yup.object().shape({
  setting_type: yup.string().required(),
  setting_data: yup.object()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.PUT(putSchema, async (req, res) => {
  const { team_id, setting_data, setting_type } = req.payload;
  return res.send(
    await handleRequest<FetchTeamSettingsAPIResponse>(
      `/teams/${team_id}/settings`,
      {
        method: 'PUT',
        data: {
          setting_type,
          setting_data
        }
      }
    )
  );
});

endpoint.handle.GET(getSchema, async (req, res) => {
  const { team_id, setting_type } = req.payload;
  return res.send(
    await handleRequest<FetchTeamSettingsAPIResponse>(
      `/teams/${team_id}/settings`,
      {
        params: {
          setting_type
        }
      }
    )
  );
});

export default endpoint.serve();
