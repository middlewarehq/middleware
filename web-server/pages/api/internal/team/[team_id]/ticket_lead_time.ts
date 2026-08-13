import * as yup from 'yup';

import { handleRequest } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';
import { isoDateString } from '@/utils/date';

// CLUSTOX: Jira integration -- the extended Lead Time breakdown's
// "ticket created -> first commit" leading phase (docs/
// JIRA_INTEGRATION_PROPOSAL.md §6A). Its own standalone proxy, not
// folded into the existing /teams/[team_id]/lead_time-backed flow --
// that one feeds the untouched, org-wide "Lead Time for Changes" DORA
// card and must keep returning exactly what it always has.
export type TicketLeadTimeMetrics = {
  matched_pr_count: number;
  avg_ticket_to_first_commit_seconds: number;
  avg_commit_only_lead_time_seconds: number;
  avg_extended_lead_time_seconds: number;
};

const pathSchema = yup.object().shape({
  team_id: yup.string().uuid().required()
});

const getSchema = yup.object().shape({
  from_date: yup.date().required(),
  to_date: yup.date().required()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  const { team_id, from_date, to_date } = req.payload;

  const metrics = await handleRequest<TicketLeadTimeMetrics>(
    `/teams/${team_id}/ticket_lead_time`,
    {
      params: {
        from_time: isoDateString(new Date(from_date)),
        to_time: isoDateString(new Date(to_date))
      }
    }
  );

  res.send(metrics);
});

export default endpoint.serve();
