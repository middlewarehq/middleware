import * as yup from 'yup';

import { handleRequest } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';
import {
  TeamIncidentSettingApiResponse,
  TeamIncidentSettingsResponse
} from '@/types/resources';

const getSchema = yup.object().shape({
  user_id: yup.string().uuid().required()
});
const pathSchema = yup.object().shape({
  team_id: yup.string().uuid().required()
});

const putSchema = yup.object().shape({
  updated_by: yup.string().required(),
  setting: yup.object().shape({
    title_includes: yup.array().of(yup.string()).required()
  })
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  const { team_id, user_id } = req.payload;
  const { setting } = await handleRequest<TeamIncidentSettingApiResponse>(
    `/teams/${team_id}/settings`,
    {
      method: 'GET',
      params: {
        setting_type: 'INCIDENT_SETTING',
        setter_id: user_id
      }
    }
  );
  return res.send({ setting } as TeamIncidentSettingsResponse);
});

endpoint.handle.PUT(putSchema, async (req, res) => {
  const { team_id, setting, updated_by } = req.payload;
  const response = await handleRequest<TeamIncidentSettingApiResponse>(
    `/teams/${team_id}/settings`,
    {
      method: 'PUT',
      data: {
        setter_id: updated_by,
        setting_type: 'INCIDENT_SETTING',
        setting_data: setting
      }
    }
  );
  return res.send({
    setting: response.setting
  } as TeamIncidentSettingsResponse);
});

export default endpoint.serve();
