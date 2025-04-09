import * as yup from 'yup';

import { handleRequest } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';
import {
  TeamIncidentPRsSettingApiResponse,
  TeamIncidentPRsSettingsResponse
} from '@/types/resources';

const getSchema = yup.object();
const pathSchema = yup.object().shape({
  team_id: yup.string().uuid().required()
});

const putSchema = yup.object().shape({
  setting: yup.object().shape({
    include_revert_prs: yup.boolean(),
    title_filters: yup.array().of(yup.string()).required(),
    head_branch_filters: yup.array().of(yup.string()).required(),
    pr_mapping_field: yup.string(),
    pr_mapping_pattern: yup.string().when('pr_mapping_field', {
      is: (pr_mapping_field: string) => pr_mapping_field !== '',
      then: yup.string().required()
    })
  })
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  const { team_id } = req.payload;
  const { setting } = await handleRequest<TeamIncidentPRsSettingApiResponse>(
    `/teams/${team_id}/settings`,
    {
      method: 'GET',
      params: {
        setting_type: 'INCIDENT_PRS_SETTING'
      }
    }
  );
  return res.send({ setting } as TeamIncidentPRsSettingsResponse);
});

endpoint.handle.PUT(putSchema, async (req, res) => {
  const { team_id, setting } = req.payload;
  const response = await handleRequest<TeamIncidentPRsSettingApiResponse>(
    `/teams/${team_id}/settings`,
    {
      method: 'PUT',
      data: {
        setting_type: 'INCIDENT_PRS_SETTING',
        setting_data: setting
      }
    }
  );
  return res.send({
    setting: response.setting
  } as TeamIncidentPRsSettingsResponse);
});

export default endpoint.serve();
