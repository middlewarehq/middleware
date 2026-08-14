import { darken, lighten } from '@mui/material';
import axios from 'axios';
import { useEffect } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useBoolState, useEasyState } from '@/hooks/useEasyState';
import { useSingleTeamConfig } from '@/hooks/useStateTeamConfig';
import { brandColors } from '@/theme/schemes/theme';
import { depFn } from '@/utils/fn';

type TicketLeadTimeMetrics = {
  matched_pr_count: number;
  avg_ticket_to_first_commit_seconds: number;
  avg_commit_only_lead_time_seconds: number;
  avg_extended_lead_time_seconds: number;
};

export type TicketLeadTimeSegment = {
  duration: number;
  bgColor: string;
  color: string;
  title: string;
  description: string;
  legendLabel: string;
  // Always true in practice (this segment only ever exists because
  // it's the new one) -- typed as `boolean`, not the literal `true`,
  // so object-literal-returning helpers (including this file's own
  // return value, and every test fixture) don't get inference-widened
  // into a type error.
  isNew: boolean;
};

export type TicketLeadTimeComparison = {
  extendedSeconds: number;
  commitOnlySeconds: number;
  matchedPrCount: number;
};

/**
 * CLUSTOX: Jira integration -- the extended Lead Time breakdown's
 * leading "ticket created -> first commit" segment (docs/
 * JIRA_INTEGRATION_PROPOSAL.md §6A).
 *
 * Its own fetch, gated on Jira being linked: an org without Jira issues
 * no extra request at all and gets exactly the unmodified 5-segment
 * breakdown LeadTimeStatsCore has always rendered. Even with Jira
 * linked, a window with no ticket-matched merged PRs (matched_pr_count
 * === 0) also renders nothing new -- there's no honest "idea to
 * production" number to show without at least one real matched PR.
 */
export const useTicketLeadTimeSegment = (): {
  ticketSegment: TicketLeadTimeSegment | null;
  comparison: TicketLeadTimeComparison | null;
} => {
  const { integrations } = useAuth();
  const isJiraLinked = Boolean(integrations?.jira?.integrated);
  const { singleTeamId, dates } = useSingleTeamConfig();

  const metrics = useEasyState<TicketLeadTimeMetrics | null>(null);
  const isLoading = useBoolState(false);

  useEffect(() => {
    if (!isJiraLinked || !singleTeamId) return;
    depFn(isLoading.true);
    axios(`/api/internal/team/${singleTeamId}/ticket_lead_time`, {
      params: {
        from_date: dates.start.toISOString(),
        to_date: dates.end.toISOString()
      }
    })
      .then((res) => depFn(metrics.set, res.data))
      .catch((error) => console.error(error))
      .finally(isLoading.false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJiraLinked, singleTeamId, dates.start, dates.end]);

  if (!isJiraLinked || isLoading.value || !metrics.value?.matched_pr_count) {
    return { ticketSegment: null, comparison: null };
  }

  const m = metrics.value;

  return {
    ticketSegment: {
      duration: m.avg_ticket_to_first_commit_seconds,
      bgColor: lighten(brandColors.ticketState.default, 0.1),
      color: darken(brandColors.ticketState.default, 0.9),
      title: 'Idea',
      description:
        'Time from the Jira ticket being created to the first commit against it, averaged over merged PRs matched to a ticket this period',
      legendLabel: 'Ticket created → first commit',
      isNew: true
    },
    comparison: {
      extendedSeconds: m.avg_extended_lead_time_seconds,
      commitOnlySeconds: m.avg_commit_only_lead_time_seconds,
      matchedPrCount: m.matched_pr_count
    }
  };
};
