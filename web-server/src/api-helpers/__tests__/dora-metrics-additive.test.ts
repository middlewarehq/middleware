/**
 * The other half of the regression guarantee: the DORA response itself.
 *
 * `noBenchmarksRegression.test.tsx` proves the five cards render with no band
 * and no caption once the payload reaches them. This proves the payload gets
 * there unchanged -- that adding benchmarks and lines of code to the
 * dora_metrics route did not disturb the four `*_stats` / `*_trends` keys the
 * original cards have always read.
 *
 * CLUSTOX: the two additions are wrapped in `.catch(() => undefined)` in the
 * route precisely so an optional decoration cannot blank the dashboard. That
 * contract had no test. Deleting either `.catch` looks harmless in review and
 * costs nothing until the day one of those calls 400s -- which has already
 * happened once on this project, when a payload key nested one level too deep
 * made the analytics server reject a sibling call inside the same Promise.all
 * and the whole dashboard went to "something went wrong".
 */
jest.mock('@/auth/session', () => ({ getAuthSession: jest.fn() }));
jest.mock('@/auth/queries', () => ({
  getTeamOrgId: jest.fn(),
  getTeamIdsForOrg: jest.fn(),
  getAllTeamIds: jest.fn()
}));
jest.mock('@/utils/cockpitMetricUtils', () => ({
  fetchLeadTimeStats: jest.fn(),
  fetchChangeFailureRateStats: jest.fn(),
  fetchMeanTimeToRestoreStats: jest.fn(),
  fetchDeploymentFrequencyStats: jest.fn(),
  fetchTeamBenchmarks: jest.fn(),
  fetchLocStats: jest.fn()
}));
jest.mock('@/api/resources/team_repos', () => ({
  getTeamRepos: jest.fn()
}));
jest.mock('@/api/resources/teams/[team_id]/unsynced_repos', () => ({
  getUnsyncedRepos: jest.fn()
}));
jest.mock('@/api/internal/team/[team_id]/insights', () => ({
  getTeamLeadTimePRs: jest.fn()
}));
jest.mock('@/api-helpers/team', () => ({
  updatePrFilterParams: jest.fn()
}));
jest.mock('@/utils/filterUtils', () => ({
  getBranchesAndRepoFilter: jest.fn(),
  getWorkFlowFiltersAsPayloadForSingleTeam: jest.fn()
}));

// CLUSTOX: the route under test. `jest.mock` calls are hoisted above every
// import, so this reading first is only an import-order rule, not a mocking
// hazard.
import handler from '@/api/internal/team/[team_id]/dora_metrics';
import { getTeamRepos } from '@/api/resources/team_repos';
import { getUnsyncedRepos } from '@/api/resources/teams/[team_id]/unsynced_repos';
import { updatePrFilterParams } from '@/api-helpers/team';
import { getTeamOrgId } from '@/auth/queries';
import { getAuthSession } from '@/auth/session';
import {
  fetchChangeFailureRateStats,
  fetchDeploymentFrequencyStats,
  fetchLeadTimeStats,
  fetchLocStats,
  fetchMeanTimeToRestoreStats,
  fetchTeamBenchmarks
} from '@/utils/cockpitMetricUtils';
import {
  getBranchesAndRepoFilter,
  getWorkFlowFiltersAsPayloadForSingleTeam
} from '@/utils/filterUtils';

const TEAM_ID = '00000000-0000-4000-8000-0000000000ff';
const ORG_ID = '00000000-0000-4000-8000-0000000000ee';

/**
 * The four original metrics, exactly as their fetchers return them. Every
 * assertion below compares the response against these by identity, so a route
 * that reshaped, renamed or re-nested any of them fails.
 */
const LEAD_TIME = {
  lead_time_stats: {
    current: { lead_time: 86400, pr_count: 12 },
    previous: { lead_time: 93600, pr_count: 10 }
  },
  lead_time_trends: { current: { a: 1 }, previous: { b: 2 } }
};
const DEPLOYMENT_FREQUENCY = {
  deployment_frequency_stats: {
    current: { avg_weekly_deployment_frequency: 4, total_deployments: 16 },
    previous: { avg_weekly_deployment_frequency: 3, total_deployments: 12 }
  },
  deployment_frequency_trends: { current: { c: 3 }, previous: { d: 4 } }
};
const CHANGE_FAILURE_RATE = {
  change_failure_rate_stats: {
    current: { change_failure_rate: 12 },
    previous: { change_failure_rate: 15 }
  },
  change_failure_rate_trends: { current: { e: 5 }, previous: { f: 6 } }
};
const MEAN_TIME_TO_RESTORE = {
  mean_time_to_restore_stats: {
    current: { mean_time_to_recovery: 4200, incident_count: 3 },
    previous: { mean_time_to_recovery: 5400, incident_count: 4 }
  },
  mean_time_to_restore_trends: { current: { g: 7 }, previous: { h: 8 } }
};
const LEAD_TIME_PRS = [{ id: 'pr-1' }];
const TEAM_REPOS = [{ id: 'repo-1' }];
const UNSYNCED_REPOS = ['repo-2'];

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.send = jest.fn(() => res);
  return res;
};

const request = () =>
  ({
    method: 'GET',
    query: {
      team_id: TEAM_ID,
      org_id: ORG_ID,
      from_date: '2026-07-01T00:00:00+00:00',
      to_date: '2026-08-01T00:00:00+00:00',
      branch_mode: 'PROD'
    },
    body: {},
    headers: {}
  }) as any;

const call = async () => {
  const res = mockRes();
  await handler(request(), res);
  return res;
};

/** Everything the route needs that is not the subject of a given test. */
const stubTheHappyPath = () => {
  (getAuthSession as jest.Mock).mockResolvedValue({
    userId: 'ad1',
    email: 'lead@clustox.com',
    role: 'ADMIN',
    orgId: ORG_ID
  });
  (getTeamOrgId as jest.Mock).mockResolvedValue(ORG_ID);

  (getBranchesAndRepoFilter as jest.Mock).mockResolvedValue({});
  (getWorkFlowFiltersAsPayloadForSingleTeam as jest.Mock).mockResolvedValue({});
  (updatePrFilterParams as jest.Mock).mockResolvedValue({ pr_filter: null });
  (getUnsyncedRepos as jest.Mock).mockResolvedValue(UNSYNCED_REPOS);
  (getTeamRepos as jest.Mock).mockResolvedValue(TEAM_REPOS);

  (fetchLeadTimeStats as jest.Mock).mockResolvedValue(LEAD_TIME);
  (fetchDeploymentFrequencyStats as jest.Mock).mockResolvedValue(
    DEPLOYMENT_FREQUENCY
  );
  (fetchChangeFailureRateStats as jest.Mock).mockResolvedValue(
    CHANGE_FAILURE_RATE
  );
  (fetchMeanTimeToRestoreStats as jest.Mock).mockResolvedValue(
    MEAN_TIME_TO_RESTORE
  );
};

const expectTheFourOriginalMetricsIntact = (body: any) => {
  expect(body.lead_time_stats).toBe(LEAD_TIME.lead_time_stats);
  expect(body.lead_time_trends).toBe(LEAD_TIME.lead_time_trends);
  expect(body.deployment_frequency_stats).toBe(
    DEPLOYMENT_FREQUENCY.deployment_frequency_stats
  );
  expect(body.deployment_frequency_trends).toBe(
    DEPLOYMENT_FREQUENCY.deployment_frequency_trends
  );
  expect(body.change_failure_rate_stats).toBe(
    CHANGE_FAILURE_RATE.change_failure_rate_stats
  );
  expect(body.change_failure_rate_trends).toBe(
    CHANGE_FAILURE_RATE.change_failure_rate_trends
  );
  expect(body.mean_time_to_restore_stats).toBe(
    MEAN_TIME_TO_RESTORE.mean_time_to_restore_stats
  );
  expect(body.mean_time_to_restore_trends).toBe(
    MEAN_TIME_TO_RESTORE.mean_time_to_restore_trends
  );
  expect(body.assigned_repos).toBe(TEAM_REPOS);
  expect(body.unsynced_repos).toBe(UNSYNCED_REPOS);
};

describe('dora_metrics is additive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stubTheHappyPath();
    (
      require('@/api/internal/team/[team_id]/insights')
        .getTeamLeadTimePRs as jest.Mock
    ).mockResolvedValue({
      data: LEAD_TIME_PRS
    });
  });

  it('sends the four original metrics unchanged when nothing is benchmarked', async () => {
    // The zero-config state every installation is in until an admin sets a
    // target: the benchmarks route resolves every metric to a null target.
    (fetchTeamBenchmarks as jest.Mock).mockResolvedValue({
      lead_time: { target: null, source: null },
      deployment_frequency: { target: null, source: null },
      change_failure_rate: { target: null, source: null },
      mean_time_to_recovery: { target: null, source: null },
      lines_of_code: { target: null, source: null }
    });
    (fetchLocStats as jest.Mock).mockResolvedValue({
      loc_stats: { current: {}, previous: {} },
      loc_trends: { current: {}, previous: {} }
    });

    const res = await call();
    const [body] = res.send.mock.calls[0];

    expectTheFourOriginalMetricsIntact(body);
    // Present but empty -- every card reads `benchmarks?.<metric>?.target`
    // and must see null, not a missing key it could mistake for a fetch error.
    expect(body.benchmarks.lines_of_code).toEqual({
      target: null,
      source: null
    });
  });

  it('still sends the four original metrics when the benchmarks call fails', async () => {
    // CLUSTOX: this is what the `.catch(() => undefined)` buys. Degrading to
    // an unbenchmarked dashboard is correct; taking the dashboard down over an
    // optional decoration is not.
    (fetchTeamBenchmarks as jest.Mock).mockRejectedValue(new Error('500'));
    (fetchLocStats as jest.Mock).mockResolvedValue({
      loc_stats: {},
      loc_trends: {}
    });

    const res = await call();
    const [body] = res.send.mock.calls[0];

    // The success path never touches res.status at all; the global error
    // handler is the only thing that sets one.
    expect(res.status).not.toHaveBeenCalled();
    expectTheFourOriginalMetricsIntact(body);
    expect(body.benchmarks).toBeUndefined();
  });

  it('still sends the four original metrics when the LOC call fails', async () => {
    (fetchTeamBenchmarks as jest.Mock).mockResolvedValue(undefined);
    (fetchLocStats as jest.Mock).mockRejectedValue(new Error('400'));

    const res = await call();
    const [body] = res.send.mock.calls[0];

    // The success path never touches res.status at all; the global error
    // handler is the only thing that sets one.
    expect(res.status).not.toHaveBeenCalled();
    expectTheFourOriginalMetricsIntact(body);
    // `undefined`, not a zeroed-out object. The LOC card distinguishes "not
    // measured" from a measured zero, and only absence can mean the former.
    expect(body.loc_stats).toBeUndefined();
    expect(body.loc_trends).toBeUndefined();
  });

  it('still sends the four original metrics when both new calls fail', async () => {
    (fetchTeamBenchmarks as jest.Mock).mockRejectedValue(new Error('500'));
    (fetchLocStats as jest.Mock).mockRejectedValue(new Error('400'));

    const res = await call();
    const [body] = res.send.mock.calls[0];

    // The success path never touches res.status at all; the global error
    // handler is the only thing that sets one.
    expect(res.status).not.toHaveBeenCalled();
    expectTheFourOriginalMetricsIntact(body);
  });

  it('control: an unguarded fetcher failing DOES take the response down', async () => {
    // CLUSTOX: without this the three cases above prove nothing -- they would
    // pass just as well if a rejection inside this route were invisible to
    // this harness. Lead time carries no `.catch` (it is not optional; there
    // is no dashboard without it), so its failure is exactly the outcome the
    // two new calls are deliberately shielded from. Same setup, same
    // assertions, opposite result.
    (fetchTeamBenchmarks as jest.Mock).mockResolvedValue(undefined);
    (fetchLocStats as jest.Mock).mockResolvedValue(undefined);
    (fetchLeadTimeStats as jest.Mock).mockRejectedValue(new Error('upstream'));

    const res = await call();

    // An error status, whichever one parseError lands on -- the point is that
    // the response stopped being the dashboard, not which code says so.
    expect(res.status).toHaveBeenCalled();
    expect(res.status.mock.calls[0][0]).toBeGreaterThanOrEqual(400);
    expect(res.send.mock.calls[0][0]).not.toHaveProperty('lead_time_stats');
  });
});
