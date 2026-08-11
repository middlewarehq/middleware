jest.mock('@/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('@/store', () => ({ useSelector: jest.fn() }));
jest.mock('@/components/OverlayPageContext', () => ({
  useOverlayPage: jest.fn()
}));
jest.mock('@/content/PullRequests/useChangeTimePipeline', () => ({
  ...jest.requireActual('@/content/PullRequests/useChangeTimePipeline'),
  usePrChangeTimePipeline: jest.fn()
}));

import { screen } from '@testing-library/react';

import { useOverlayPage } from '@/components/OverlayPageContext';
import { usePrChangeTimePipeline } from '@/content/PullRequests/useChangeTimePipeline';
import { useAuth } from '@/hooks/useAuth';
import { useSelector } from '@/store';
import { renderWithTheme as render } from '@/utils/testUtils';

import { LeadTimeStatsCore } from '../LeadTimeStatsCore';

// CLUSTOX: Jira integration -- the extended Lead Time breakdown's
// leading "ticket created -> first commit" segment (docs/
// JIRA_INTEGRATION_PROPOSAL.md §6A). First test file for this
// component -- it had none before this change -- so it also covers the
// pre-existing 5-segment rendering, to make sure the new, optional
// segment never disturbs it.
const segment = (overrides = {}) => ({
  duration: 3600,
  bgColor: '#000',
  color: '#fff',
  clipPath: 'polygon(0 0)',
  title: 'Segment',
  description: 'A segment',
  ...overrides
});

const ticketSegment = (overrides = {}) => ({
  duration: 7200,
  bgColor: '#111',
  color: '#eee',
  title: 'Idea',
  description: 'Ticket to first commit',
  ...overrides
});

describe('LeadTimeStatsCore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ role: 'CONTRIBUTOR' });
    (useSelector as jest.Mock).mockReturnValue([]);
    (useOverlayPage as jest.Mock).mockReturnValue({ addPage: jest.fn() });
    (usePrChangeTimePipeline as jest.Mock).mockReturnValue({
      reposWithNoDeploymentsConfigured: [],
      reposCountWithWorkflowConfigured: 0
    });
  });

  const segments = [
    segment({ title: 'Commit' }),
    segment({ title: 'Response' }),
    segment({ title: 'Rework' }),
    segment({ title: 'Merge' }),
    segment({ title: 'Deploy' })
  ];

  it('renders exactly the original 5 segments when no ticket data is given', () => {
    render(<LeadTimeStatsCore changeTimeSegments={segments} />);

    expect(screen.getByText('Commit')).toBeInTheDocument();
    expect(screen.getByText('Deploy')).toBeInTheDocument();
    expect(screen.queryByText('Idea')).not.toBeInTheDocument();
    expect(screen.queryByText(/Idea to production/)).not.toBeInTheDocument();
  });

  it('renders exactly the original 5 segments when ticketSegment/comparison are explicitly undefined', () => {
    render(
      <LeadTimeStatsCore
        changeTimeSegments={segments}
        ticketSegment={undefined}
        comparison={undefined}
      />
    );

    expect(screen.queryByText('Idea')).not.toBeInTheDocument();
  });

  it('prepends the ticket segment and shows the comparison line when both are given', () => {
    render(
      <LeadTimeStatsCore
        changeTimeSegments={segments}
        ticketSegment={ticketSegment()}
        comparison={{
          extendedSeconds: 10800,
          commitOnlySeconds: 3600,
          matchedPrCount: 42
        }}
      />
    );

    expect(screen.getByText('Idea')).toBeInTheDocument();
    expect(screen.getByText('Commit')).toBeInTheDocument();
    expect(screen.getByText(/Idea to production/)).toBeInTheDocument();
    expect(screen.getByText(/commit-only/)).toBeInTheDocument();
    expect(screen.getByText(/42 ticket-matched PRs/)).toBeInTheDocument();
  });

  it('singularizes "PR" for exactly one matched PR', () => {
    render(
      <LeadTimeStatsCore
        changeTimeSegments={segments}
        ticketSegment={ticketSegment()}
        comparison={{
          extendedSeconds: 10800,
          commitOnlySeconds: 3600,
          matchedPrCount: 1
        }}
      />
    );

    expect(screen.getByText(/1 ticket-matched PR$/)).toBeInTheDocument();
  });

  it('still shows the unmodified "Total" footer when showTotal is set, regardless of the ticket segment', () => {
    render(
      <LeadTimeStatsCore
        changeTimeSegments={segments}
        ticketSegment={ticketSegment()}
        comparison={{
          extendedSeconds: 10800,
          commitOnlySeconds: 3600,
          matchedPrCount: 42
        }}
        showTotal
      />
    );

    // The "Total" footer sums only the original 5 segments (3600 * 3 +
    // 3600 + 3600 = 5h) -- ticketSegment's 7200s must not leak into it.
    expect(screen.getByText(/^Total:/)).toBeInTheDocument();
  });
});
