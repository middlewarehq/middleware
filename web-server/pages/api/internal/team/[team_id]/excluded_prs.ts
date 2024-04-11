import * as yup from 'yup';

import { handleRequest } from '@/api-helpers/axios';
import { Endpoint, nullSchema } from '@/api-helpers/global';
import { mockTeamExcludedPrs } from '@/mocks/teamExcludedPrs';
import { PR } from '@/types/resources';

type SettingsApi = {
  setting: { excluded_pr_ids: ID[] };
};

const getSchema = yup.object().shape({
  team_id: yup.string().uuid().required()
});

const putSchema = yup.object().shape({
  team_id: yup.string().uuid().required(),
  excluded_prs: yup.array().of(yup.mixed().optional()).required()
});

const endpoint = new Endpoint(nullSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  const { team_id } = req.payload;
  if (req.meta?.features?.use_mock_data)
    return res.send({ excluded_pr_ids: mockTeamExcludedPrs });

  const excludedPrs = await handleRequest<PR[]>(
    `/teams/${team_id}/prs/excluded`
  );

  return res.send({
    excluded_prs: excludedPrs
  });
});

endpoint.handle.PUT(putSchema, async (req, res) => {
  const { team_id, excluded_prs } = req.payload;
  const excludedPrIds = excluded_prs?.map((pr) => pr.id) || [];

  if (req.meta?.features?.use_mock_data) return res.send({ excluded_prs });

  await handleRequest<SettingsApi>(`/teams/${team_id}/settings`, {
    method: 'PUT',
    data: {
      setting_type: 'EXCLUDED_PRS_SETTING',
      setting_data: { excluded_pr_ids: excludedPrIds }
    }
  });

  return res.send({
    excluded_prs
  });
});

export default endpoint.serve();
