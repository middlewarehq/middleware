import * as yup from 'yup';

import { handleRequest } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';
import { isoDateString } from '@/utils/date';

// CLUSTOX: Jira integration, Phase 4 (§6C/§6E) -- the DORA Metrics
// page's Jira widget. Deliberately its own standalone proxy, not folded
// into dora_metrics.ts (which already aggregates the 4 existing DORA
// cards' own calls) -- keeps this additive to that endpoint rather than
// risking a regression in it. See docs/JIRA_INTEGRATION_PROPOSAL.md.
export type TicketInsights = {
  cycle_time_by_project: {
    project_key: string;
    project_name: string;
    ticket_count: number;
    avg_total_seconds: number;
    avg_seconds_by_category: Record<string, number>;
  }[];
  prs_without_ticket_count: number;
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

  const insights = await handleRequest<TicketInsights>(
    `/teams/${team_id}/ticket_insights`,
    {
      params: {
        // isoDateString, not Date#toISOString -- the latter's trailing
        // "Z" isn't accepted by Python's datetime.fromisoformat() on the
        // backend (pre-3.11), the same reason every other DORA proxy
        // already uses this helper instead.
        from_time: isoDateString(new Date(from_date)),
        to_time: isoDateString(new Date(to_date))
      }
    }
  );

  res.send(insights);
});

export default endpoint.serve();
