import * as yup from 'yup';

import { handleRequest } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';

// CLUSTOX: Jira integration -- the Sprint rollup chart (docs/
// JIRA_INTEGRATION_PROPOSAL.md §6D). No date-range params -- a sprint's
// own start/end dates are its natural window, unlike every other Jira
// widget on this page, which scopes to the DORA Metrics page's selected
// period.
export type Sprint = {
  name: string;
  state: string;
  start_date: string | null;
  end_date: string | null;
  planned_count: number;
  completed_count: number;
};

const pathSchema = yup.object().shape({
  team_id: yup.string().uuid().required()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.GET(yup.object(), async (req, res) => {
  const { team_id } = req.payload;

  const sprints = await handleRequest<Sprint[]>(`/teams/${team_id}/sprints`);

  res.send(sprints);
});

export default endpoint.serve();
