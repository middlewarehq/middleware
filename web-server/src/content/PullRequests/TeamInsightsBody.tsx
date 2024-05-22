import { ExpandMoreRounded } from '@mui/icons-material';
import {
  Box,
  useTheme,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Divider,
  Button,
  darken,
  lighten
} from '@mui/material';
import { Serie } from '@nivo/line';
import { millisecondsInSecond, secondsInWeek } from 'date-fns/constants';
import pluralize from 'pluralize';
import { mean } from 'ramda';
import { FC, useMemo, useEffect, useCallback } from 'react';

import { EmptyState } from '@/components/EmptyState';
import { FlexBox } from '@/components/FlexBox';
import { LegendsMenu } from '@/components/LegendsMenu';
import { useOverlayPage } from '@/components/OverlayPageContext';
import { PrTableWithPrExclusionMenu } from '@/components/PRTable/PrTableWithPrExclusionMenu';
import Scrollbar from '@/components/Scrollbar';
import { MiniSwitch } from '@/components/Shared';
import { Line } from '@/components/Text';
import { TrendsLineChart } from '@/components/TrendsLineChart';
import { track } from '@/constants/events';
import { ProcessChartWithContainer } from '@/content/PullRequests/ProcessChartWithContainer';
import { ClipPathEnum } from '@/content/PullRequests/useChangeTimePipeline';
import { useDoraMetricsGraph } from '@/hooks/useDoraMetricsGraph';
import { useBoolState } from '@/hooks/useEasyState';
import { usePageRefreshCallback } from '@/hooks/usePageRefreshCallback';
import { useCurrentDateRangeLabel } from '@/hooks/useStateTeamConfig';
// import { fetchCycleTimeDetails, fetchTeamInsights } from '@/slices/collab';
import { useSelector } from '@/store';
import { brandColors } from '@/theme/schemes/theme';
import { PR } from '@/types/resources';
import { getDurationString } from '@/utils/date';

import { LeadTimeStatsCore } from './LeadTimeStatsCore';

// export const TeamInsightsBody: FC = () => {
//   const router = useRouter();

//   const cycleTimeArgs = useMemo(() => {
//     const [min, max] = router.query?.params || [];

//     if (min || max)
//       return {
//         cycle_time: { min: Number(min), max: Number(max) }
//       };

//     return null;
//   }, [router.query?.params]);
//   const pageRefreshCallback = usePageRefreshCallback();
//   const { isLoading, refreshDataCallback } = usePageData(
//     fetchTeamInsights,
//     'teamInsights',
//     cycleTimeArgs
//   );
//   const prUpdateCallback = useCallback(() => {
//     refreshDataCallback();
//     pageRefreshCallback();
//   }, [pageRefreshCallback, refreshDataCallback]);
//   const prs = useSelector((state) => state.collab.teamInsights.curr.data);

//   const isErrored = useSelector(
//     (state) => state.collab.requests.teamInsights === FetchState.FAILURE
//   );

//   if (isLoading) return <FullContentLoader />;

//   if (isErrored) return <SomethingWentWrong />;

//   if (!prs.length)
//     return (
//       <>
//         <Title cycleTime={cycleTimeArgs?.cycle_time} />
//         <Typography variant="subtitle1" fontSize="large">
//           No pull requests were found in this date range
//         </Typography>
//       </>
//     );

//   return (
//     <>
//       <Title cycleTime={cycleTimeArgs?.cycle_time} />
//       <Typography variant="h4" mt={2} fontSize="large">
//         List of PRs in this time range
//       </Typography>
//       <PrTableWithPrExclusionMenu
//         propPrs={prs}
//         onUpdateCallback={prUpdateCallback}
//       />
//     </>
//   );
// };

export const TeamInsightsBodyRouterless: FC<{
  min?: number;
  max?: number;
  referrer?: 'dora_metrics';
}> = ({ min, max, referrer }) => {
  const theme = useTheme();
  const isLeadTimeActive = true;

  const cycleTimeArgs = useMemo(() => {
    if (min || max)
      return {
        cycle_time: { min: Number(min), max: Number(max) }
      };

    return null;
  }, [max, min]);
  const pageRefreshCallback = usePageRefreshCallback();
  const prUpdateCallback = useCallback(() => {
    pageRefreshCallback();
  }, [pageRefreshCallback]);

  const prs = useSelector((state) => state.doraMetrics.summary_prs);
  const referredByDoraMetrics = referrer === 'dora_metrics';
  const showChart = useBoolState(referredByDoraMetrics);
  const dateRangeLabel = useCurrentDateRangeLabel();
  const { upsertPage } = useOverlayPage();

  const { trendsSeriesMap } = useDoraMetricsGraph();

  const showBreakdownStatsInGraph = useBoolState(false);
  const series: Serie[] = useMemo(() => {
    if (!trendsSeriesMap) return [];
    const commonBreakdownSegments = [
      trendsSeriesMap.firstResponseTimeTrends,
      trendsSeriesMap.reworkTimeTrends,
      trendsSeriesMap.mergeTimeTrends
    ];
    const leadTimeBreakdownSegments = [
      trendsSeriesMap.firstCommitToPrTrends,
      ...commonBreakdownSegments,
      trendsSeriesMap.deployTimeTrends
    ];
    if (showBreakdownStatsInGraph.value) return leadTimeBreakdownSegments;
    return [trendsSeriesMap.totalLeadTimeTrends];
  }, [showBreakdownStatsInGraph.value, trendsSeriesMap]);

  // if (isLoading) return <MiniLoader label="Loading PRs..." />;

  // if (isErrored) return <SomethingWentWrong />;

  if (!prs.length)
    return (
      <FlexBox col gap={2}>
        <Title cycleTime={cycleTimeArgs?.cycle_time} />
        <EmptyState
          desc={`No pull requests were found between ${dateRangeLabel}`}
          type="CODE_NO_PRS"
        >
          <Button
            size="small"
            variant="outlined"
            onClick={() =>
              upsertPage({
                page: {
                  ui: 'team_prs',
                  props: null,
                  title: 'Team PRs'
                }
              })
            }
          >
            See insights of all PRs
          </Button>
        </EmptyState>
      </FlexBox>
    );

  return (
    <FlexBox col gap={2}>
      <FlexBox mx={-2} width={`calc(100% + ${theme.spacing(4)})`}>
        <Accordion
          sx={{
            border: `1px solid ${theme.colors.secondary.light}`,
            borderRadius: 1,
            width: '100%'
          }}
          expanded={showChart.value}
          onChange={showChart.toggle}
        >
          <AccordionSummary expandIcon={<ExpandMoreRounded />}>
            <FlexBox fullWidth alignCenter justifyBetween>
              <Line bigish medium>
                Lead Time Trends
              </Line>
            </FlexBox>
          </AccordionSummary>
          <AccordionDetails>
            {referredByDoraMetrics ? (
              <FlexBox col>
                <FlexBox alignCenter gap1>
                  Show Breakdown
                  <MiniSwitch
                    onChange={showBreakdownStatsInGraph.toggle}
                    defaultChecked={false}
                  />
                </FlexBox>
                <FlexBox
                  fullWidth
                  height={'300px'}
                  alignCenter
                  justifyCenter
                  p={1}
                >
                  <TrendsLineChart series={series} isTimeBased />
                </FlexBox>
                <LegendsMenu series={series} />
              </FlexBox>
            ) : (
              <FlexBox col fullWidth relative gap={2}>
                <ProcessChartWithContainer
                  chartId="process-chart-overlaid"
                  minHeight="25vh"
                  maxHeight="300px"
                  borderRadius={1}
                  legendOutside
                  hideTitle
                />
              </FlexBox>
            )}
          </AccordionDetails>
        </Accordion>
      </FlexBox>
      <Divider />
      <Title cycleTime={cycleTimeArgs?.cycle_time} />
      <PrBreakdownAndInsights prs={prs} prUpdateCallback={prUpdateCallback} />
      <Line white bold mt={2}>
        {prs.length} Pull {pluralize('request', prs.length)} submitted by the
        team
      </Line>
      <PrTableWithPrExclusionMenu
        propPrs={prs}
        onUpdateCallback={prUpdateCallback}
      />
    </FlexBox>
  );
};

export const PrBreakdownAndInsights: FC<{
  prs: PR[];
  prevPrs?: PR[];
  prUpdateCallback: () => void;
}> = ({ prs, prevPrs, prUpdateCallback }) => {
  const { changeTimeDetailsArray } = useComputedPrChangeTime(prs);

  if (!prs.length) return null;

  return (
    <FlexBox gap={3}>
      <FlexBox col gap1>
        <FlexBox justifyBetween alignCenter mb={1} gap={2}>
          <FlexBox col>
            <Line white bold>
              Average LT breakdown
            </Line>
            <Line small>Commit to deploy</Line>
          </FlexBox>
        </FlexBox>

        <Box sx={{ borderRadius: 1 }}>
          <LeadTimeStatsCore
            changeTimeSegments={changeTimeDetailsArray}
            showTotal
          />
        </Box>
      </FlexBox>
    </FlexBox>
  );
};

export const PrListTooltipTitle: FC<{ prs: PR[] }> = ({ prs }) => {
  useEffect(() => {
    track('PR_NON_REVIEWED_LIST_VIEWED');
  }, []);

  return (
    <Scrollbar autoHeight>
      <FlexBox col gap1>
        {prs.map((pr, i) => (
          <FlexBox key={i} col>
            <Line white bold>
              <a href={pr.pr_link} target="_blank" rel="noreferrer">
                #{pr.number}
              </a>{' '}
              {pr.title}
            </Line>
            <Line white>
              {pr.repo_name} / +{pr.additions} -{pr.deletions}
            </Line>
          </FlexBox>
        ))}
      </FlexBox>
    </Scrollbar>
  );
};

const Title: FC<{ cycleTime: { min: number; max: number } | null }> = ({
  cycleTime
}) => {
  const dateRangeLabel = useCurrentDateRangeLabel();
  const maxTimeUnder2Wks =
    cycleTime?.max <= millisecondsInSecond * secondsInWeek * 2;

  return (
    <FlexBox col>
      <Line big white bold>
        Pull request insights for team
      </Line>
      <Line>
        {cycleTime?.min || cycleTime?.max ? (
          <Box component="span">
            Showing insights for PRs from{' '}
            <Line color="info">{dateRangeLabel}</Line>, with cycle times{' '}
          </Box>
        ) : (
          <Box component="span">
            Showing insights for all PRs from{' '}
            <Line color="info">{dateRangeLabel}</Line>
          </Box>
        )}
        {cycleTime?.min && cycleTime?.max && maxTimeUnder2Wks ? (
          <Line component="span" color="info">
            between {getDurationString(cycleTime?.min)} and{' '}
            {getDurationString(cycleTime?.max)}
          </Line>
        ) : !cycleTime?.min && cycleTime?.max ? (
          <Line component="span" color="info">
            under {getDurationString(cycleTime?.max)}
          </Line>
        ) : cycleTime?.min && (!cycleTime?.max || !maxTimeUnder2Wks) ? (
          <Line component="span" color="info">
            over {getDurationString(cycleTime?.min)}
          </Line>
        ) : null}
      </Line>
    </FlexBox>
  );
};

const useComputedPrChangeTime = (prs: PR[]) => {
  const showingLeadTime = true;

  const avgFirstCommitToPrOpenTime = useMemo(
    () =>
      mean(
        prs
          // This will include only those PRs that are included in overall LT calculations
          ?.filter((pr) => Number.isFinite(pr.first_commit_to_open))
          ?.map((pr) => Math.max(pr.first_commit_to_open, 0) || 0) || []
      ),
    [prs]
  );

  const avgFirstResponseTime = useMemo(
    () =>
      mean(
        prs
          ?.filter((pr) =>
            showingLeadTime ? Number.isFinite(pr.first_response_time) : true
          )
          ?.map((pr) => pr.first_response_time || 0) || []
      ),
    [prs, showingLeadTime]
  );
  const avgReworkTime = useMemo(
    () =>
      mean(
        prs
          ?.filter((pr) =>
            showingLeadTime ? Number.isFinite(pr.rework_time) : true
          )
          ?.map((pr) => pr.rework_time || 0) || []
      ),
    [prs, showingLeadTime]
  );
  const avgMergeTime = useMemo(
    () =>
      mean(
        prs
          ?.filter((pr) =>
            showingLeadTime ? Number.isFinite(pr.merge_time) : true
          )
          ?.map((pr) => pr.merge_time || 0) || []
      ),
    [prs, showingLeadTime]
  );

  const avgMergeToDeployTime = useMemo(
    () =>
      mean(
        prs
          ?.filter((pr) => Number.isFinite(pr.merge_to_deploy))
          ?.map((pr) => pr.merge_to_deploy || 0) || []
      ),
    [prs]
  );

  const firstCommitToPrDetails = useMemo(
    () => ({
      duration: avgFirstCommitToPrOpenTime || 0,
      bgColor: lighten(brandColors.ticketState.todo, 0.1),
      color: darken(brandColors.ticketState.todo, 0.9),
      clipPath: ClipPathEnum.FIRST,
      title: 'Commit',
      description: 'Time taken to create PR since the first commit'
    }),
    [avgFirstCommitToPrOpenTime]
  );

  const firstResponseDetails = useMemo(
    () => ({
      duration: avgFirstResponseTime || 0,
      bgColor: lighten(brandColors.pr.firstResponseTime, 0.5),
      color: darken(brandColors.pr.firstResponseTime, 0.9),
      clipPath: ClipPathEnum.DEFAULT,
      title: 'Response',
      description: 'Time taken to submit the first review on a PR'
    }),
    [avgFirstResponseTime]
  );

  const reworkDetails = useMemo(
    () => ({
      duration: avgReworkTime || 0,
      bgColor: lighten(brandColors.pr.reworkTime, 0.5),
      color: darken(brandColors.pr.reworkTime, 0.9),
      clipPath: ClipPathEnum.DEFAULT,
      title: 'Rework',
      description: 'Time spent in reviewing the PR, and making changes (if any)'
    }),
    [avgReworkTime]
  );

  const mergeDetails = useMemo(
    () => ({
      duration: avgMergeTime || 0,
      bgColor: lighten(brandColors.pr.mergeTime, 0.5),
      color: darken(brandColors.pr.mergeTime, 0.9),
      clipPath: ClipPathEnum.DEFAULT,
      title: 'Merge',
      description:
        'Time waited to finally merge the PR after approval was provided'
    }),
    [avgMergeTime]
  );

  const prToDeploymentDetails = useMemo(
    () => ({
      duration: avgMergeToDeployTime || 0,
      bgColor: lighten(brandColors.ticketState.done, 0.4),
      color: darken(brandColors.ticketState.done, 0.9),
      clipPath: ClipPathEnum.LAST,
      title: 'Deploy',
      description: 'Time taken to deploy the PR once its merged'
    }),
    [avgMergeToDeployTime]
  );

  const changeTimeDetailsArray = [
    firstCommitToPrDetails,
    firstResponseDetails,
    reworkDetails,
    mergeDetails,
    prToDeploymentDetails
  ];

  return {
    changeTimeDetailsArray
  };
};
