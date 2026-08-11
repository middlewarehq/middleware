import { WarningAmberRounded } from '@mui/icons-material';
import axios from 'axios';
import { FC, useEffect, useMemo } from 'react';

import { CardRoot } from '@/content/DoraMetrics/DoraCards/sharedComponents';
import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { useAuth } from '@/hooks/useAuth';
import { useBoolState, useEasyState } from '@/hooks/useEasyState';
import { useSingleTeamConfig } from '@/hooks/useStateTeamConfig';
import { getDurationString } from '@/utils/date';
import { depFn } from '@/utils/fn';

// CLUSTOX: Jira integration, Phase 4 (§6C/§6E) -- see
// docs/JIRA_INTEGRATION_PROPOSAL.md. Deliberately its own card with its
// own fetch, not wired into useDoraStats/the dora_metrics redux slice
// the 4 existing cards share -- this is purely additive to the DORA
// Metrics page, not a change to any of the existing 4 cards' own data
// or code.
type TicketInsights = {
  cycle_time_by_status: {
    status: string;
    avg_seconds: number;
    ticket_count: number;
  }[];
  avg_total_cycle_seconds: number | null;
  ticket_count: number;
  prs_without_ticket_count: number;
};

export const TicketCycleTimeCard: FC = () => {
  const { integrations } = useAuth();
  const isJiraLinked = Boolean(integrations?.jira?.integrated);
  const { singleTeamId, dates } = useSingleTeamConfig();

  const insights = useEasyState<TicketInsights | null>(null);
  const isLoading = useBoolState(false);

  useEffect(() => {
    if (!isJiraLinked || !singleTeamId) return;
    depFn(isLoading.true);
    axios(`/api/internal/team/${singleTeamId}/ticket_insights`, {
      params: {
        from_date: dates.start.toISOString(),
        to_date: dates.end.toISOString()
      }
    })
      .then((res) => depFn(insights.set, res.data))
      .catch((error) => console.error(error))
      .finally(isLoading.false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJiraLinked, singleTeamId, dates.start, dates.end]);

  const sortedStatuses = useMemo(
    () =>
      [...(insights.value?.cycle_time_by_status || [])].sort(
        (a, b) => b.avg_seconds - a.avg_seconds
      ),
    [insights.value]
  );

  if (!isJiraLinked || isLoading.value) return null;
  if (!insights.value?.ticket_count) return null;

  return (
    <CardRoot sx={{ cursor: 'default', p: 2 }} gap2>
      <FlexBox justifyBetween alignCenter gap2>
        <FlexBox col>
          <Line big semibold white>
            Ticket Cycle Time
          </Line>
          <Line tiny secondary>
            Average time in each status, for tickets completed this
            period
          </Line>
        </FlexBox>
        {Boolean(insights.value.avg_total_cycle_seconds) && (
          <FlexBox col alignItems="flex-end" flexShrink={0}>
            <Line big semibold white>
              {getDurationString(insights.value.avg_total_cycle_seconds)}
            </Line>
            <Line tiny secondary>
              avg, creation to done
            </Line>
          </FlexBox>
        )}
      </FlexBox>
      <FlexBox col gap1>
        {sortedStatuses.map((row) => (
          <FlexBox key={row.status} justifyBetween alignCenter>
            <Line>{row.status}</Line>
            <FlexBox gap1 alignCenter>
              <Line secondary tiny>
                {row.ticket_count} ticket{row.ticket_count === 1 ? '' : 's'}
              </Line>
              <Line semibold>{getDurationString(row.avg_seconds)}</Line>
            </FlexBox>
          </FlexBox>
        ))}
      </FlexBox>
      {Boolean(insights.value.prs_without_ticket_count) && (
        <FlexBox alignCenter gap1 mt="auto">
          <WarningAmberRounded fontSize="small" color="warning" />
          <Line tiny secondary>
            {insights.value.prs_without_ticket_count} PR
            {insights.value.prs_without_ticket_count === 1 ? '' : 's'} merged
            this period with no linked Jira ticket
          </Line>
        </FlexBox>
      )}
    </CardRoot>
  );
};
