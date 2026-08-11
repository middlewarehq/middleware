import axios from 'axios';
import { FC, useEffect } from 'react';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { CardRoot } from '@/content/DoraMetrics/DoraCards/sharedComponents';
import { useAuth } from '@/hooks/useAuth';
import { useBoolState, useEasyState } from '@/hooks/useEasyState';
import { useSingleTeamConfig } from '@/hooks/useStateTeamConfig';
import { depFn } from '@/utils/fn';

// CLUSTOX: Jira integration -- the Sprint rollup chart (docs/
// JIRA_INTEGRATION_PROPOSAL.md §6D). Its own card with its own fetch,
// same additive pattern as TicketCycleTimeCard/LeadTimeBreakdownCard --
// no date-range dependency, since a sprint's own start/end dates are its
// natural window, not the page's selected period.
type Sprint = {
  name: string;
  state: string;
  start_date: string | null;
  end_date: string | null;
  planned_count: number;
  completed_count: number;
};

const BAR_MAX_HEIGHT_PX = 120;

const useSprints = () => {
  const { integrations } = useAuth();
  const isJiraLinked = Boolean(integrations?.jira?.integrated);
  const { singleTeamId } = useSingleTeamConfig();

  const sprints = useEasyState<Sprint[]>([]);
  const isLoading = useBoolState(false);

  useEffect(() => {
    if (!isJiraLinked || !singleTeamId) return;
    depFn(isLoading.true);
    axios(`/api/internal/team/${singleTeamId}/sprints`)
      .then((res) => depFn(sprints.set, res.data))
      .catch((error) => console.error(error))
      .finally(isLoading.false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJiraLinked, singleTeamId]);

  return { isJiraLinked, isLoading: isLoading.value, sprints: sprints.value };
};

export const SprintRollupCard: FC = () => {
  const { isJiraLinked, isLoading, sprints } = useSprints();

  if (!isJiraLinked || isLoading || !sprints.length) return null;

  // Shared scale across every bar in the chart, not per-sprint -- so a
  // sprint's bar height is comparable against every other sprint's, the
  // same way the design reference's own bars read (Sprint 42's taller
  // bars mean literally more tickets, not "more relative to its own
  // sprint").
  const maxCount = Math.max(
    ...sprints.flatMap((sprint) => [sprint.planned_count, sprint.completed_count]),
    1
  );

  return (
    <CardRoot sx={{ cursor: 'default', p: 2 }} gap2>
      <FlexBox col>
        <Line big semibold white>
          Sprint rollup
        </Line>
        <Line tiny secondary>
          Planned vs. shipped, per sprint.
        </Line>
      </FlexBox>
      <FlexBox gap={3} alignItems="flex-end" flexWrap="wrap">
        {sprints.map((sprint) => (
          <SprintColumn key={sprint.name} sprint={sprint} maxCount={maxCount} />
        ))}
      </FlexBox>
      <FlexBox gap2>
        <FlexBox gap1 alignCenter>
          <FlexBox
            width="9px"
            height="9px"
            borderRadius="2px"
            border="1.5px dashed"
            borderColor="text.secondary"
          />
          <Line tiny secondary>
            Planned
          </Line>
        </FlexBox>
        <FlexBox gap1 alignCenter>
          <FlexBox width="9px" height="9px" borderRadius="2px" bgcolor="success.main" />
          <Line tiny secondary>
            Shipped
          </Line>
        </FlexBox>
      </FlexBox>
    </CardRoot>
  );
};

const SprintColumn: FC<{ sprint: Sprint; maxCount: number }> = ({
  sprint,
  maxCount
}) => (
  <FlexBox col alignCenter gap1>
    <FlexBox
      gap={1 / 2}
      alignItems="flex-end"
      height={`${BAR_MAX_HEIGHT_PX}px`}
    >
      <FlexBox
        width="20px"
        height={`${(sprint.planned_count / maxCount) * 100}%`}
        borderRadius="3px 3px 0 0"
        border="1.5px dashed"
        borderColor="text.secondary"
        title={`Planned: ${sprint.planned_count}`}
      />
      <FlexBox
        width="20px"
        height={`${(sprint.completed_count / maxCount) * 100}%`}
        borderRadius="3px 3px 0 0"
        bgcolor="success.main"
        title={`Shipped: ${sprint.completed_count}`}
      />
    </FlexBox>
    <Line tiny secondary maxWidth="90px" textAlign="center">
      {sprint.name}
    </Line>
  </FlexBox>
);
