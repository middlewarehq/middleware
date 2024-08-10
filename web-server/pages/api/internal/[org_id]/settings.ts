import * as yup from 'yup';

import { handleRequest } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';
import { OrgSettingsApiResponse } from '@/types/resources';

const pathSchema = yup.object().shape({
  org_id: yup.string().uuid().required()
});

const getSchema = yup.object().shape({
  setting_type: yup.string().required()
});

const putSchema = yup.object().shape({
  setting_type: yup.string().required(),
  user_id: yup.string().uuid().optional(),
  setting_data: yup.object().required()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.PUT(putSchema, async (req, res) => {
  const { org_id, setting_type, user_id, setting_data } = req.payload;
  return res.send(
    await handleRequest<OrgSettingsApiResponse>(`/orgs/${org_id}/settings`, {
      method: 'PUT',
      data: {
        setting_type,
        setter_id: user_id,
        setting_data
      }
    }).then((s) => s.setting)
  );
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
