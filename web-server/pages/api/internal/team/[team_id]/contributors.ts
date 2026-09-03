import { endOfDay, startOfDay } from 'date-fns';
import * as yup from 'yup';

import { internal } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';
import { isoDateString } from '@/utils/date';

// CLUSTOX: backs the contributor filter on the DORA metrics page. team_id is
// validated by Endpoint.serve(), which asserts the caller may read that team.
const pathSchema = yup.object().shape({
  team_id: yup.string().uuid().required()
});

const getSchema = yup.object().shape({
  team_id: yup.string().uuid().required(),
  from_date: yup.date().required(),
  to_date: yup.date().required()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  const { team_id, from_date: rawFromDate, to_date: rawToDate } = req.payload;

  // The same day-boundary normalisation the DORA route applies to the very
  // same picker values (see dora_metrics.ts). Both routes are handed
  // `dates.start` / `dates.end`, which carry the wall-clock time of day, so
  // forwarding them raw made this window strictly narrower than the metrics
  // window: a PR merged later today than the current clock time counted
  // towards Lead Time but was missing from the dropdown that is supposed to
  // list exactly the people with data in view.
  const from_date = isoDateString(startOfDay(new Date(rawFromDate)));
  const to_date = isoDateString(endOfDay(new Date(rawToDate)));

  const contributors = await internal.get(`/teams/${team_id}/contributors`, {
    params: { from_time: from_date, to_time: to_date }
  });

  res.send(contributors.data);
});

export default endpoint.serve();
