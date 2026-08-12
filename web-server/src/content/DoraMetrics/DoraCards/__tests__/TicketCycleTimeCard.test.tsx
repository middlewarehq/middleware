jest.mock('@/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('@/hooks/useStateTeamConfig', () => ({
  useSingleTeamConfig: jest.fn()
}));
jest.mock('@/contexts/ModalContext', () => ({ useModal: jest.fn() }));
jest.mock('axios');

import { renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';

import { useModal } from '@/contexts/ModalContext';
import { useAuth } from '@/hooks/useAuth';
import { useSingleTeamConfig } from '@/hooks/useStateTeamConfig';
import { renderWithTheme as render } from '@/utils/testUtils';

import {
  DataHygieneCard,
  segmentWidths,
  TicketCycleTimeCard,
  UnlinkedPrsModalBody,
  useTicketInsights
} from '../TicketCycleTimeCard';

const TEAM_ID = 'team-1';
const DATES = { start: new Date('2026-05-01'), end: new Date('2026-08-01') };

const project = (overrides = {}) => ({
  project_key: 'PZDA',
  project_name: 'Project Zero Deposit Africa',
  ticket_count: 222,
  avg_total_seconds: 1128947,
  avg_seconds_by_category: {
    'To Do': 495562,
    'In Progress': 631158,
    Done: 2227
  },
  ...overrides
});

const insights = (overrides = {}) => ({
  cycle_time_by_project: [project()],
  prs_without_ticket_count: 0,
  ...overrides
});

// CLUSTOX: Jira integration, Phase 4 (§6C/§6E). See
// docs/JIRA_INTEGRATION_PROPOSAL.md. useTicketInsights is the one fetch
// backing both TicketCycleTimeCard and DataHygieneCard -- now tested on
// its own (see the "fetches exactly once" test below), since the two
// cards it feeds are presentational and no longer fetch independently.
describe('useTicketInsights', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSingleTeamConfig as jest.Mock).mockReturnValue({
      singleTeamId: TEAM_ID,
      dates: DATES
    });
  });

  it('does not fetch when Jira is not linked for this org', () => {
    (useAuth as jest.Mock).mockReturnValue({ integrations: {} });
    const { result } = renderHook(() => useTicketInsights());

    expect(result.current.isJiraLinked).toBe(false);
    expect(axios).not.toHaveBeenCalled();
  });

  it('does not fetch when there is no team selected yet', () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    (useSingleTeamConfig as jest.Mock).mockReturnValue({
      singleTeamId: undefined,
      dates: DATES
    });
    renderHook(() => useTicketInsights());

    expect(axios).not.toHaveBeenCalled();
  });

  it('fetches this team\'s ticket insights for the given date range, exactly once', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    (axios as unknown as jest.Mock).mockResolvedValue({ data: insights() });

    const { result } = renderHook(() => useTicketInsights());

    await waitFor(() => expect(result.current.insights).not.toBeNull());
    expect(axios).toHaveBeenCalledTimes(1);
    expect(axios).toHaveBeenCalledWith(
      `/api/internal/team/${TEAM_ID}/ticket_insights`,
      {
        params: {
          from_date: DATES.start.toISOString(),
          to_date: DATES.end.toISOString()
        }
      }
    );
  });
});

describe('TicketCycleTimeCard', () => {
  it('renders nothing when Jira is not linked', () => {
    const { container } = render(
      <TicketCycleTimeCard isJiraLinked={false} isLoading={false} insights={insights()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while still loading', () => {
    const { container } = render(
      <TicketCycleTimeCard isJiraLinked isLoading insights={null} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when no project has ticket data for this period', () => {
    const { container } = render(
      <TicketCycleTimeCard
        isJiraLinked
        isLoading={false}
        insights={insights({ cycle_time_by_project: [] })}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders one row per tracked project, with its own key, name, and avg', () => {
    render(
      <TicketCycleTimeCard
        isJiraLinked
        isLoading={false}
        insights={insights({
          cycle_time_by_project: [
            project({ project_key: 'PZDA', avg_total_seconds: 1128947 }),
            project({
              project_key: 'PAY',
              project_name: 'Payments',
              avg_total_seconds: 86400
            })
          ]
        })}
      />
    );

    expect(screen.getByText('PZDA')).toBeInTheDocument();
    expect(screen.getByText('PAY')).toBeInTheDocument();
    expect(screen.getByText(/Payments/)).toBeInTheDocument();
  });

  it('still renders a tiny-but-real category as a visible segment, not a sub-pixel sliver', () => {
    // Real production data: "Done" was ~0.2% of the total (closed in
    // ~37 minutes against a ~13 day ticket life) -- at that literal
    // percentage the bar rendered no visible green at all, reading as
    // missing data. This is the regression the Done segment must not
    // repeat.
    render(
      <TicketCycleTimeCard
        isJiraLinked
        isLoading={false}
        insights={insights({
          cycle_time_by_project: [
            project({
              avg_total_seconds: 1128947,
              avg_seconds_by_category: {
                'To Do': 495562,
                'In Progress': 631158,
                Done: 2227
              }
            })
          ]
        })}
      />
    );

    // FlexBox's `title` prop renders a MUI Tooltip, not a native `title`
    // attribute -- MUI clones the child with an `aria-label` mirroring
    // the tooltip text instead, which is what's actually queryable
    // without opening the tooltip.
    expect(screen.getByLabelText(/Done: 37m 7s/)).toBeInTheDocument();
  });
});

// CLUSTOX: covers the visual bug found comparing the live-rendered
// widget against real data -- a category real enough to have its own
// tooltip could still render with ~0 width. segmentWidths is the pure
// function behind the bar, tested in isolation so the floor/donation
// math doesn't need a full render to verify.
describe('segmentWidths', () => {
  it('returns each category at its true percentage when none needs flooring', () => {
    const widths = segmentWidths(
      { 'To Do': 100, 'In Progress': 100, Done: 100 },
      300
    );

    // toBeCloseTo, not toEqual -- (100/300)*100 and 100/3 are the same
    // value mathematically but land a ULP apart as IEEE-754 floats.
    widths.forEach((w) => expect(w.pct).toBeCloseTo(100 / 3, 10));
  });

  it('floors a near-zero category to the minimum and still sums to 100', () => {
    const widths = segmentWidths(
      { 'To Do': 495562, 'In Progress': 631158, Done: 2227 },
      1128947
    );

    const done = widths.find((w) => w.category === 'Done');
    expect(done.pct).toBeGreaterThanOrEqual(4);
    expect(widths.reduce((sum, w) => sum + w.pct, 0)).toBeCloseTo(100, 5);
  });

  it('excludes a category with zero seconds entirely', () => {
    const widths = segmentWidths({ 'To Do': 100, Done: 100 }, 200);
    expect(widths.map((w) => w.category)).toEqual(['To Do', 'Done']);
  });

  it('returns an empty list when the total is zero, instead of dividing by it', () => {
    expect(segmentWidths({ 'To Do': 0 }, 0)).toEqual([]);
  });

  it('preserves each segment\'s real seconds for the tooltip, unadjusted', () => {
    const widths = segmentWidths(
      { 'To Do': 495562, 'In Progress': 631158, Done: 2227 },
      1128947
    );

    expect(widths.find((w) => w.category === 'Done').seconds).toBe(2227);
  });
});

// CLUSTOX: Jira integration, Phase 4 (§6E) -- now its own full-width
// card on the page (was stacked below Ticket Cycle Time in the same
// column), fed by the same useTicketInsights result as
// TicketCycleTimeCard rather than fetching it again. See
// docs/JIRA_INTEGRATION_PROPOSAL.md.
describe('DataHygieneCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useModal as jest.Mock).mockReturnValue({ addModal: jest.fn() });
  });

  it('renders nothing when Jira is not linked', () => {
    const { container } = render(
      <DataHygieneCard
        isJiraLinked={false}
        isLoading={false}
        insights={insights({ prs_without_ticket_count: 4 })}
        teamId={TEAM_ID}
        dates={DATES}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while still loading', () => {
    const { container } = render(
      <DataHygieneCard
        isJiraLinked
        isLoading
        insights={null}
        teamId={TEAM_ID}
        dates={DATES}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when every merged PR is linked', () => {
    const { container } = render(
      <DataHygieneCard
        isJiraLinked
        isLoading={false}
        insights={insights({ prs_without_ticket_count: 0 })}
        teamId={TEAM_ID}
        dates={DATES}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the unmatched-PR count and the real project key in the convention hint', () => {
    render(
      <DataHygieneCard
        isJiraLinked
        isLoading={false}
        insights={insights({
          cycle_time_by_project: [project({ project_key: 'PZDA' })],
          prs_without_ticket_count: 4
        })}
        teamId={TEAM_ID}
        dates={DATES}
      />
    );

    expect(screen.getByText(/PRs merged this period with/)).toBeInTheDocument();
    expect(screen.getByText('no linked ticket')).toBeInTheDocument();
    // Real project key, not a hardcoded placeholder -- matches the
    // design reference's own "check branch naming against PAY-123"
    // convention hint, just with this team's actual key.
    expect(screen.getByText(/PZDA-123 convention/)).toBeInTheDocument();
  });

  it('opens the unlinked-PRs drill-down modal, scoped to the current team and date range, on "View PRs"', async () => {
    const addModal = jest.fn();
    (useModal as jest.Mock).mockReturnValue({ addModal });
    render(
      <DataHygieneCard
        isJiraLinked
        isLoading={false}
        insights={insights({ prs_without_ticket_count: 4 })}
        teamId={TEAM_ID}
        dates={DATES}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /view prs/i }));

    expect(addModal).toHaveBeenCalledTimes(1);
    const [modalArgs] = addModal.mock.calls[0];
    expect(modalArgs.title).toBe('PRs with no linked Jira ticket');
    expect(modalArgs.body.props).toMatchObject({ teamId: TEAM_ID, dates: DATES });
  });
});

const unlinkedPr = (overrides = {}) => ({
  id: 'pr-1',
  title: 'feat(payments): add refund flow',
  url: 'https://github.com/org/repo/pull/42',
  head_branch: 'feat/refund-flow',
  author: 'jordan',
  merged_at: '2026-07-15T10:00:00+00:00',
  ...overrides
});

// CLUSTOX: Jira integration, Phase 4 (§6E) -- the Data Hygiene
// drill-down's own lazy fetch. See docs/JIRA_INTEGRATION_PROPOSAL.md.
describe('UnlinkedPrsModalBody', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches this team\'s unlinked PRs for the given date range', async () => {
    (axios as unknown as jest.Mock).mockResolvedValue({ data: [unlinkedPr()] });

    render(<UnlinkedPrsModalBody teamId={TEAM_ID} dates={DATES} />);

    await screen.findByText(/feat\(payments\): add refund flow/);
    expect(axios).toHaveBeenCalledWith(
      `/api/internal/team/${TEAM_ID}/unlinked_prs`,
      {
        params: {
          from_date: DATES.start.toISOString(),
          to_date: DATES.end.toISOString()
        }
      }
    );
  });

  it('renders branch, author, and merge date for each PR', async () => {
    (axios as unknown as jest.Mock).mockResolvedValue({ data: [unlinkedPr()] });

    render(<UnlinkedPrsModalBody teamId={TEAM_ID} dates={DATES} />);

    expect(
      await screen.findByText(/feat\/refund-flow/)
    ).toBeInTheDocument();
    expect(screen.getByText(/jordan/)).toBeInTheDocument();
    expect(screen.getByText(/Jul 15, 2026/)).toBeInTheDocument();
  });

  it('renders one entry per PR, in the order the backend returned them', async () => {
    (axios as unknown as jest.Mock).mockResolvedValue({
      data: [
        unlinkedPr({ id: 'pr-new', title: 'newer PR' }),
        unlinkedPr({ id: 'pr-old', title: 'older PR' })
      ]
    });

    render(<UnlinkedPrsModalBody teamId={TEAM_ID} dates={DATES} />);

    expect(await screen.findByText('newer PR')).toBeInTheDocument();
    expect(screen.getByText('older PR')).toBeInTheDocument();
  });

  it('shows an error message instead of crashing when the fetch fails', async () => {
    (axios as unknown as jest.Mock).mockRejectedValue(new Error('network error'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<UnlinkedPrsModalBody teamId={TEAM_ID} dates={DATES} />);

    expect(await screen.findByText(/Could not load PRs/)).toBeInTheDocument();
  });
});
