import * as yup from 'yup';

import { handleRequest } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';
import { isoDateString } from '@/utils/date';

// CLUSTOX: Jira integration, Phase 4 (§6E) -- the Data Hygiene card's
// drill-down. Its own standalone proxy, not folded into ticket_insights.ts
// -- that one loads on every DORA Metrics page view, this one only when
// someone actually opens the unmatched-PRs list. See
// docs/JIRA_INTEGRATION_PROPOSAL.md.
export type UnlinkedPr = {
  id: string;
  title: string;
  url: string;
  head_branch: string;
  author: string;
  merged_at: string;
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

  const prs = await handleRequest<UnlinkedPr[]>(
    `/teams/${team_id}/unlinked_prs`,
    {
      params: {
        // isoDateString, not Date#toISOString -- see ticket_insights.ts
        // for why (Python's datetime.fromisoformat() pre-3.11 rejects a
        // bare "Z" offset).
        from_time: isoDateString(new Date(from_date)),
        to_time: isoDateString(new Date(to_date))
      }
    }
  );

  res.send(prs);
});

export default endpoint.serve();
