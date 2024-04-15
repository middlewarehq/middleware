import { endOfDay, startOfDay } from 'date-fns';
import * as yup from 'yup';

import { Endpoint } from '@/api-helpers/global';
import {
  batchPaginatedRequest,
  PaginatedResponse
} from '@/api-helpers/internal';
import { adaptPr } from '@/api-helpers/pr';
import { updatePrFilterParams } from '@/api-helpers/team';
import { MAX_INT } from '@/constants/generic';
import { mockTeamPullRequests } from '@/mocks/pull-requests';
import { BasePR, Comparison, PR, RepoFilterConfig } from '@/types/resources';
import { getCycleTimeForPr } from '@/utils/code';
import { isoDateString, getDateWithComparisonRanges } from '@/utils/date';
import { getFilters } from '@/utils/cockpitMetricUtils';
import { handleRequest } from '@/api-helpers/axios';

const pathSchema = yup.object().shape({
  team_id: yup.string().uuid().required()
});

const getSchema = yup.object().shape({
  from_date: yup.date().required(),
  to_date: yup.date().required(),
  branches: yup.string().optional().nullable(),
  cycle_time: yup
    .object()
    .shape({
      min: yup.number().optional().nullable(),
      max: yup.number().optional().nullable()
    })
    .optional()
    .nullable(),
  repo_filters: yup.mixed().optional().nullable()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  if (req.meta?.features.use_mock_data) {
    return res.send({
      curr: mockTeamPullRequests,
      prev: mockTeamPullRequests
    });
  }

  const { curr } = getDateWithComparisonRanges(
    req.payload.from_date,
    req.payload.to_date
  );

  const [currInsights] = await Promise.all([
    getTeamPrs({
      team_id: req.payload.team_id,
      branches: req.payload.branches,
      from_date: curr.from,
      to_date: curr.to,
      cycle_time: req.payload.cycle_time,
      repo_filters: req.payload.repo_filters
    })
  ]);

  return res.send({
    curr: currInsights,
    prev: { data: [], page: 1, page_size: 100, total_count: 100 }
  } as Comparison<PaginatedResponse<PR>>);
});

export default endpoint.serve();

type GetTeamPrs = {
  team_id: string;
  branches?: string;
  from_date?: Date | DateString;
  to_date?: Date | DateString;
  cycle_time?: { min?: number; max?: number };
  repo_filters?: RepoFilterConfig;
};

export type GetTeamPrArgs = Omit<GetTeamPrs, 'cycle_time'>;

export const getTeamPrs = async ({
  team_id,
  branches,
  from_date,
  to_date,
  cycle_time,
  repo_filters
}: GetTeamPrs) => {
  const params = await updatePrFilterParams(
    team_id,
    {
      from_time: isoDateString(startOfDay(new Date(from_date))),
      to_time: isoDateString(endOfDay(new Date(to_date))),
      page_size: 100,
      page: 1,
      min_cycle: cycle_time?.min || 0,
      max_cycle: cycle_time?.max || MAX_INT
    },
    { branches, repo_filters }
  );

  return await batchPaginatedRequest<BasePR>(
    `/teams/${team_id}/lead_time/prs`,
    params
  ).then((r) => ({
    ...r,
    data: r.data.map((pr) =>
      adaptPr({ ...pr, cycle_time: getCycleTimeForPr(pr) })
    )
  }));
};

export const getTeamPrsWithComparisonSegment = ({
  team_id,
  branches,
  from_date,
  to_date,
  repo_filters
}: GetTeamPrs): [Promise<PR[]>, Promise<PR[]>] => {
  const { curr, prev } = getDateWithComparisonRanges(from_date, to_date);

  const currentSegmentPromise = getTeamPrs({
    team_id,
    branches,
    from_date: curr.from,
    to_date: curr.to,
    repo_filters
  }).then((r) => r.data);

  const previousSegmentPromise = getTeamPrs({
    team_id,
    branches,
    from_date: prev.from,
    to_date: prev.to,
    repo_filters
  }).then((r) => r.data);

  return [currentSegmentPromise, previousSegmentPromise];
};

export const getTeamLeadTimePRs = (
  team_id: string,
  from_time: Date | DateString,
  to_time: Date | DateString,
  prFilter: ReturnType<typeof getFilters>
) => {
  return handleRequest<{ data: PR[] }>(`/teams/${team_id}/lead_time/prs`, {
    params: { from_time, to_time, ...prFilter }
  });
};
