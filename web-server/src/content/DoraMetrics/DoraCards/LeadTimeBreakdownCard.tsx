import { Chip } from '@mui/material';
import { FC } from 'react';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { CardRoot } from '@/content/DoraMetrics/DoraCards/sharedComponents';
import { useLeadTimePipeline } from '@/content/PullRequests/useChangeTimePipeline';
import { LeadTimeStatsCore } from '@/content/PullRequests/LeadTimeStatsCore';
import { useTicketLeadTimeSegment } from '@/content/PullRequests/useTicketLeadTimeSegment';
import { useAuth } from '@/hooks/useAuth';
import { getDurationString } from '@/utils/date';

// CLUSTOX: Jira integration -- the extended Lead Time breakdown,
// promoted from a click-through-only drill-down to its own
// always-visible card on the main DORA Metrics page, matching the
// design reference. See docs/JIRA_INTEGRATION_PROPOSAL.md §6A.
//
// ChangeTimeCard.tsx (the actual, protected "Lead Time for Changes"
// tile above this one on the page) is completely untouched -- this is
// a new, adjacent card, not a change to it. Reuses the same
// LeadTimeStatsCore/useTicketLeadTimeSegment already built for
// TeamInsightsBody's drill-down, and reads the team-wide 5-segment
// breakdown already sitting in the dora_metrics redux slice this page
// itself populates -- no new fetch for that part.
//
// Renders nothing when Jira isn't linked, or when there's no
// ticket-matched PR data for this team/period -- there's no honest
// "idea to production" number to show without at least one real
// matched PR, and the plain 5-segment breakdown already has its own
// place (the existing drill-down), so this card would be pure
// duplication otherwise.
export const LeadTimeBreakdownCard: FC = () => {
  const { integrations } = useAuth();
  const isJiraLinked = Boolean(integrations?.jira?.integrated);
  const { leadTimeDetailsArray } = useLeadTimePipeline();
  const { ticketSegment, comparison } = useTicketLeadTimeSegment();

  if (!isJiraLinked || !ticketSegment) return null;

  return (
    <CardRoot sx={{ cursor: 'default', p: 2 }} gap2>
      <FlexBox justifyBetween gap2 flexWrap="wrap">
        <FlexBox col>
          <Line big semibold white>
            Lead Time for Changes
          </Line>
          <Line tiny secondary>
            Extended with a leading phase from Jira — ticket creation to
            first commit — so the number reflects idea-to-production, not
            just commit-to-production.
          </Line>
        </FlexBox>
        {/* CLUSTOX: matches the design reference -- the "idea to
            production vs. commit-only" comparison as a single header
            badge, not an inline line above the bar (LeadTimeStatsCore no
            longer renders that line itself, see its own note). */}
        {comparison && (
          <Chip
            sx={{ bgcolor: 'warning.light', flexShrink: 0 }}
            label={
              <Line bold white>
                {getDurationString(comparison.extendedSeconds, {
                  segments: 2
                })}{' '}
                avg, up from{' '}
                {getDurationString(comparison.commitOnlySeconds, {
                  segments: 2
                })}{' '}
                commit-only
              </Line>
            }
          />
        )}
      </FlexBox>
      <LeadTimeStatsCore
        changeTimeSegments={leadTimeDetailsArray}
        ticketSegment={ticketSegment}
        comparison={comparison}
        showLegend
      />
    </CardRoot>
  );
};
