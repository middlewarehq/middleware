import * as yup from 'yup';

import { handleRequest } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';
import { OrgAlertSettings, OrgSettingsApiResponse } from '@/types/resources';

const getSchema = yup.object().shape({
  user_id: yup.string().uuid().required()
});

const putSchema = yup.object().shape({
  updated_setting: yup.boolean().required(),
  user_id: yup.string().uuid().required()
});

const pathSchema = yup.object().shape({
  org_id: yup.string().uuid().required()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  const { org_id, user_id } = req.payload;
  return res.send(await getOrgAlertAsIncidentServiceSetting(org_id, user_id));
});

endpoint.handle.PUT(putSchema, async (req, res) => {
  const { org_id, user_id, updated_setting } = req.payload;
  return res.send(
    await updatedOrgAlertAsIncidentServiceSetting(
      org_id,
      user_id,
      updated_setting
    )
  );
});

export const getOrgAlertAsIncidentServiceSetting = (org_id: ID, user_id: ID) =>
  handleRequest<OrgSettingsApiResponse<OrgAlertSettings>>(`/orgs/${org_id}/settings`, {
    params: {
      setting_type: 'SHOULD_SYNC_ALERTS_AS_INCIDENTS_SETTING',
      setter_id: user_id
    }
  }).then((r) => r.setting);

export const updatedOrgAlertAsIncidentServiceSetting = (
  org_id: ID,
  user_id: ID,
  updated_setting: boolean
) =>
  handleRequest<OrgSettingsApiResponse<OrgAlertSettings>>(`/orgs/${org_id}/settings`, {
    data: {
      setting_type: 'SHOULD_SYNC_ALERTS_AS_INCIDENTS_SETTING',
      setter_id: user_id,
      setting_data: { should_sync_alerts_as_incidents: updated_setting }
    },
    method: 'PUT'
  }).then((r) => r.setting);

export default endpoint.serve();
