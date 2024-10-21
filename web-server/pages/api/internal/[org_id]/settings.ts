import * as yup from 'yup';

import { handleRequest } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';
import { OrgSettingsApiResponse } from '@/types/resources';

import { syncReposForOrg } from './sync_repos';

const pathSchema = yup.object().shape({
  org_id: yup.string().uuid().required()
});

const getSchema = yup.object().shape({
  setting_type: yup.string().required()
});

const putSchema = yup.object().shape({
  setting_type: yup.string().required(),
  setting_data: yup.object().required()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.PUT(putSchema, async (req, res) => {
  const { org_id, setting_type, setting_data } = req.payload;

  const response = await handleRequest<OrgSettingsApiResponse>(
    `/orgs/${org_id}/settings`,
    {
      method: 'PUT',
      data: {
        setting_type,
        setting_data
      }
    }
  );

  if (setting_type === 'DEFAULT_SYNC_DAYS_SETTING') {
    syncReposForOrg();
  }

  return res.send(response.setting);
});

endpoint.handle.GET(getSchema, async (req, res) => {
  const { org_id, setting_type } = req.payload;
  return res.send(
    await handleRequest<OrgSettingsApiResponse>(`/orgs/${org_id}/settings`, {
      params: {
        setting_type
      }
    }).then((s) => s.setting)
  );
});

export default endpoint.serve();
