jest.mock('@/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('@/store', () => ({ useSelector: jest.fn() }));
jest.mock('@/components/OverlayPageContext', () => ({
  useOverlayPage: jest.fn()
}));
jest.mock('@/content/PullRequests/useChangeTimePipeline', () => ({
  ...jest.requireActual('@/content/PullRequests/useChangeTimePipeline'),
  useLeadTimePipeline: jest.fn(),
  usePrChangeTimePipeline: jest.fn()
}));
jest.mock('@/content/PullRequests/useTicketLeadTimeSegment', () => ({
  useTicketLeadTimeSegment: jest.fn()
}));

import { screen } from '@testing-library/react';

import { useOverlayPage } from '@/components/OverlayPageContext';
import {
  useLeadTimePipeline,
  usePrChangeTimePipeline
} from '@/content/PullRequests/useChangeTimePipeline';
import { useTicketLeadTimeSegment } from '@/content/PullRequests/useTicketLeadTimeSegment';
import { useAuth } from '@/hooks/useAuth';
import { useSelector } from '@/store';
import { renderWithTheme as render } from '@/utils/testUtils';

import { LeadTimeBreakdownCard } from '../LeadTimeBreakdownCard';

// CLUSTOX: Jira integration -- the extended Lead Time breakdown,
// promoted to its own always-visible card on the main DORA Metrics
// page. See docs/JIRA_INTEGRATION_PROPOSAL.md §6A.
const fiveSegments = () => [
  { duration: 3600, bgColor: '#000', color: '#fff', clipPath: '', title: 'Commit', description: '', legendLabel: 'First commit → PR opened' },
  { duration: 3600, bgColor: '#000', color: '#fff', clipPath: '', title: 'Response', description: '', legendLabel: 'First response' },
  { duration: 3600, bgColor: '#000', color: '#fff', clipPath: '', title: 'Rework', description: '', legendLabel: 'Rework' },
  { duration: 3600, bgColor: '#000', color: '#fff', clipPath: '', title: 'Merge', description: '', legendLabel: 'Merge' },
  { duration: 3600, bgColor: '#000', color: '#fff', clipPath: '', title: 'Deploy', description: '', legendLabel: 'Merge → deploy' }
];

describe('LeadTimeBreakdownCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSelector as jest.Mock).mockReturnValue([]);
    (useOverlayPage as jest.Mock).mockReturnValue({ addPage: jest.fn() });
    (usePrChangeTimePipeline as jest.Mock).mockReturnValue({
      reposWithNoDeploymentsConfigured: [],
      reposCountWithWorkflowConfigured: 0
    });
    (useLeadTimePipeline as jest.Mock).mockReturnValue({
      leadTimeDetailsArray: fiveSegments(),
      totalLeadTime: 18000
    });
  });

  it('renders nothing when Jira is not linked', () => {
    (useAuth as jest.Mock).mockReturnValue({ integrations: {} });
    (useTicketLeadTimeSegment as jest.Mock).mockReturnValue({
      ticketSegment: null,
      comparison: null
    });

    const { container } = render(<LeadTimeBreakdownCard />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when Jira is linked but there are no ticket-matched PRs this period', () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    (useTicketLeadTimeSegment as jest.Mock).mockReturnValue({
      ticketSegment: null,
      comparison: null
    });

    const { container } = render(<LeadTimeBreakdownCard />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the card with the ticket segment and comparison when both are present', () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    (useTicketLeadTimeSegment as jest.Mock).mockReturnValue({
      ticketSegment: {
        duration: 172800,
        bgColor: '#111',
        color: '#eee',
        title: 'Idea',
        description: 'Ticket to first commit',
        legendLabel: 'Ticket created → first commit',
        isNew: true
      },
      comparison: {
        extendedSeconds: 190800,
        commitOnlySeconds: 18000,
        matchedPrCount: 200
      }
    });

    render(<LeadTimeBreakdownCard />);

    expect(screen.getByText('Lead Time for Changes')).toBeInTheDocument();
    // Full design-reference labels in the legend, not the short in-bar
    // titles ("Idea"/"Commit") LeadTimeStatsCore uses in its default,
    // non-legend mode.
    expect(
      screen.getByText('Ticket created → first commit')
    ).toBeInTheDocument();
    expect(screen.getByText('First commit → PR opened')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText(/Idea to production/)).toBeInTheDocument();
    expect(screen.getByText(/200 ticket-matched PRs/)).toBeInTheDocument();
  });

  it('does not render a redundant "Total" footer -- the comparison line already covers it', () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    (useTicketLeadTimeSegment as jest.Mock).mockReturnValue({
      ticketSegment: {
        duration: 172800,
        bgColor: '#111',
        color: '#eee',
        title: 'Idea',
        description: '',
        legendLabel: 'Ticket created → first commit',
        isNew: true
      },
      comparison: {
        extendedSeconds: 190800,
        commitOnlySeconds: 18000,
        matchedPrCount: 200
      }
    });

    render(<LeadTimeBreakdownCard />);

    expect(screen.queryByText(/^Total:/)).not.toBeInTheDocument();
  });
});
