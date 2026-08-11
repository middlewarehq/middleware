import { WarningAmberRounded } from '@mui/icons-material';
import axios from 'axios';
import { FC, useEffect } from 'react';

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
//
// One fetch, two visually separate cards (Ticket Cycle Time and Data
// Hygiene, matching the design reference) -- this component is the
// shared orchestrator so DoraMetricsBody only needs the one
// <TicketCycleTimeCard /> line it already has, and the two cards below
// never issue a second, duplicate request for the same data.
const CATEGORY_COLOR: Record<string, string> = {
  'To Do': 'info.main',
  'In Progress': 'warning.main',
  Done: 'success.main'
};
const CATEGORY_ORDER = ['To Do', 'In Progress', 'Done'];

// A category that took a genuinely tiny share of a ticket's total life
// (e.g. real data: a project closed its "Done" segment in ~37 minutes
// against a ~13 day total -- 0.2%) rounds to a sub-pixel sliver at its
// true percentage, which reads as missing data rather than "this really
// happened, it was just fast". Every category below this floor is
// bumped up to it; the tooltip and the numbers everywhere else stay the
// real, unadjusted values -- only the rendered width is touched.
const MIN_SEGMENT_PCT = 4;

/**
 * Segment widths as percentages that always sum to 100 across every
 * category with real (nonzero) time in it, each at least
 * MIN_SEGMENT_PCT wide. Categories with room above the floor donate
 * width proportionally to the ones below it, so the bar never overflows
 * (or underfills) its container.
 */
export const segmentWidths = (
  avgSecondsByCategory: Record<string, number>,
  avgTotalSeconds: number
): { category: string; seconds: number; pct: number }[] => {
  const present = CATEGORY_ORDER.filter(
    (category) => (avgSecondsByCategory[category] || 0) > 0
  );
  if (!present.length || !avgTotalSeconds) return [];

  const rawPct = present.map(
    (category) => (avgSecondsByCategory[category] / avgTotalSeconds) * 100
  );
  const deficit = rawPct.reduce(
    (sum, pct) => sum + Math.max(0, MIN_SEGMENT_PCT - pct),
    0
  );
  const donorPool = rawPct.reduce(
    (sum, pct) => sum + Math.max(0, pct - MIN_SEGMENT_PCT),
    0
  );

  return present.map((category, i) => {
    const pct = rawPct[i];
    let flooredPct = pct;
    if (deficit > 0) {
      flooredPct =
        pct <= MIN_SEGMENT_PCT
          ? MIN_SEGMENT_PCT
          : pct - ((pct - MIN_SEGMENT_PCT) / donorPool) * deficit;
    }
    return {
      category,
      seconds: avgSecondsByCategory[category],
      pct: flooredPct
    };
  });
};

type ProjectCycleTime = {
  project_key: string;
  project_name: string;
  ticket_count: number;
  avg_total_seconds: number;
  avg_seconds_by_category: Record<string, number>;
};

type TicketInsights = {
  cycle_time_by_project: ProjectCycleTime[];
  prs_without_ticket_count: number;
};

const useTicketInsights = () => {
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

  return { isJiraLinked, isLoading: isLoading.value, insights: insights.value };
};

export const TicketCycleTimeCard: FC = () => {
  const { isJiraLinked, isLoading, insights } = useTicketInsights();

  if (!isJiraLinked || isLoading) return null;
  if (!insights?.cycle_time_by_project.length) return null;

  return (
    <FlexBox gap={2} flexWrap="wrap">
      <ProjectCycleTimeCard projects={insights.cycle_time_by_project} />
      <DataHygieneCard count={insights.prs_without_ticket_count} />
    </FlexBox>
  );
};

const ProjectCycleTimeCard: FC<{ projects: ProjectCycleTime[] }> = ({
  projects
}) => (
  <CardRoot sx={{ cursor: 'default', p: 2, minWidth: '360px' }} gap2 flex={2}>
    <FlexBox col>
      <Line big semibold white>
        Ticket Cycle Time
      </Line>
      <Line tiny secondary>
        Time in each status, for tickets completed this period
      </Line>
    </FlexBox>
    <FlexBox col gap2>
      {projects.map((project) => (
        <ProjectCycleTimeRow key={project.project_key} project={project} />
      ))}
    </FlexBox>
    <FlexBox gap2 flexWrap="wrap">
      {CATEGORY_ORDER.map((category) => (
        <FlexBox key={category} gap1 alignCenter>
          <FlexBox
            width="9px"
            height="9px"
            borderRadius="2px"
            bgcolor={CATEGORY_COLOR[category]}
          />
          <Line tiny secondary>
            {category}
          </Line>
        </FlexBox>
      ))}
    </FlexBox>
  </CardRoot>
);

const ProjectCycleTimeRow: FC<{ project: ProjectCycleTime }> = ({ project }) => (
  <FlexBox col gap1>
    <FlexBox justifyBetween alignCenter gap2>
      <Line tiny>
        <Line component="span" semibold white>
          {project.project_key}
        </Line>{' '}
        — {project.project_name}
      </Line>
      <Line tiny secondary flexShrink={0}>
        {getDurationString(project.avg_total_seconds)} avg
      </Line>
    </FlexBox>
    <FlexBox height="20px" borderRadius="5px" overflow="hidden">
      {segmentWidths(project.avg_seconds_by_category, project.avg_total_seconds).map(
        ({ category, seconds, pct }) => (
          <FlexBox
            key={category}
            height="100%"
            width={`${pct}%`}
            noShrink
            bgcolor={CATEGORY_COLOR[category]}
            title={`${category}: ${getDurationString(seconds)}`}
          />
        )
      )}
    </FlexBox>
  </FlexBox>
);

const DataHygieneCard: FC<{ count: number }> = ({ count }) => {
  if (!count) return null;

  return (
    <CardRoot
      sx={{ cursor: 'default', p: 2, bgcolor: 'warning.light' }}
      gap1
      flex={1}
      minWidth="260px"
    >
      <Line big semibold white>
        Data Hygiene
      </Line>
      <FlexBox gap2 alignCenter mt="auto">
        <WarningAmberRounded color="warning" sx={{ fontSize: '28px' }} />
        <Line tiny>
          <Line component="span" big semibold white>
            {count}
          </Line>{' '}
          PR{count === 1 ? '' : 's'} merged this period with no linked Jira
          ticket
        </Line>
      </FlexBox>
    </CardRoot>
  );
};
