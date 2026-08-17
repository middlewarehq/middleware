import { ArrowForwardRounded, WarningAmberRounded } from '@mui/icons-material';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import { Button, Chip, darken, List, ListItem } from '@mui/material';
import Link from 'next/link';
import pluralize from 'pluralize';
import { useCallback, useMemo } from 'react';

import { Chart2 } from '@/components/Chart2';
import { useSelectedContributors } from '@/components/ContributorFilter';
import { FlexBox } from '@/components/FlexBox';
import { useOverlayPage } from '@/components/OverlayPageContext';
import { Line } from '@/components/Text';
import { track } from '@/constants/events';
import { ROUTES } from '@/constants/routes';
import { isRoleLessThanEM } from '@/constants/useRoute';
import {
  CardRoot,
  NoDataImg
} from '@/content/DoraMetrics/DoraCards/sharedComponents';
import {
  doraCardTrendSeries,
  useDoraCardChartOptions,
  usePropsForChangeTimeCard
} from '@/content/DoraMetrics/DoraCards/sharedHooks';
import { useAuth } from '@/hooks/useAuth';
import { useCountUp } from '@/hooks/useCountUp';
import { useSelector } from '@/store';
import { ChangeTimeModes } from '@/types/resources';
import { benchmarkCaption } from '@/utils/benchmarks';
import { merge } from '@/utils/datatype';
import { getDurationString, getSortedDatesAsArrayFromMap } from '@/utils/date';

import { getDoraLink } from '../../PullRequests/DeploymentFrequencyGraph';
import { DoraMetricsComparisonPill } from '../DoraMetricsComparisonPill';
import { MetricExternalRead } from '../MetricExternalRead';
import { MissingDORAProviderLink } from '../MissingDORAProviderLink';

export const ChangeTimeCard = () => {
  const { addPage } = useOverlayPage();
  const { role } = useAuth();
  const isEng = isRoleLessThanEM(role);
  const selectedContributors = useSelectedContributors();

  const {
    reposCountWithWorkflowConfigured,
    isSufficientDataAvailable,
    activeModeProps,
    isAllAssignedReposHaveDeploymentsConfigured,
    allAssignedRepos,
    reposWithNoDeploymentsConfigured,
    prevChangeTime
  } = usePropsForChangeTimeCard();

  const [currentLeadTimeTrendsData, prevLeadTimeTrendsData] = useSelector(
    (s) => [
      s.doraMetrics.metrics_summary?.lead_time_trends.current,
      s.doraMetrics.metrics_summary?.lead_time_trends.previous
    ]
  );

  const leadTimeBenchmark = useSelector(
    (s) => s.doraMetrics.metrics_summary?.benchmarks?.lead_time
  );

  const isCodeProviderIntegrationEnabled = true;

  const showClassificationBadge =
    isSufficientDataAvailable && isCodeProviderIntegrationEnabled;

  const mergedLeadTimeTrends = merge(
    currentLeadTimeTrendsData,
    prevLeadTimeTrendsData
  );

  const leadTimeValues = useMemo(
    () =>
      getSortedDatesAsArrayFromMap(mergedLeadTimeTrends).map(
        (key) => mergedLeadTimeTrends[key].lead_time
      ),
    [mergedLeadTimeTrends]
  );

  const series = useMemo(
    () =>
      doraCardTrendSeries(
        'Lead Time',
        leadTimeValues,
        activeModeProps.backgroundColor
      ),
    [activeModeProps.backgroundColor, leadTimeValues]
  );

  const weekLabels = useMemo(
    () => getSortedDatesAsArrayFromMap(mergedLeadTimeTrends),
    [mergedLeadTimeTrends]
  );
  const formatLeadTime = useCallback(
    (value: number) => getDurationString(value) || '0',
    []
  );

  // CLUSTOX: the band is only built when the chart itself is on screen. With
  // insufficient data the card renders NoDataImg instead, and a band drawn
  // over a placeholder would be comparing a real target against nothing.
  const chartOptions = useDoraCardChartOptions(
    isSufficientDataAvailable
      ? {
          metric: 'lead_time',
          target: leadTimeBenchmark?.target,
          // CLUSTOX: seconds on both sides -- `activeModeProps.count` and the
          // plotted `lead_time` trend are both raw seconds, and the target is
          // stored in seconds too. Nothing to convert here, unlike
          // Deployment Frequency.
          actual: activeModeProps.count,
          values: leadTimeValues
        }
      : null,
    { labels: weekLabels, format: formatLeadTime }
  );

  const leadTimeDuration = useCountUp(activeModeProps.count || 0);

  // CLUSTOX: gated on isSufficientDataAvailable -- same guard the card
  // already uses to decide between the chart and "Insufficient data". A
  // target line/caption over a placeholder state would compare a real
  // benchmark against a meaningless zero.
  const leadTimeBenchmarkCaption = useMemo(
    () =>
      isSufficientDataAvailable && leadTimeBenchmark
        ? benchmarkCaption(
            'lead_time',
            activeModeProps.count,
            leadTimeBenchmark.target,
            leadTimeBenchmark.source
          )
        : null,
    [isSufficientDataAvailable, leadTimeBenchmark, activeModeProps.count]
  );

  return (
    <CardRoot
      onClick={() => {
        track('DORA_METRICS_SEE_DETAILS_CLICKED', {
          viewed: 'CT'
        });
        addPage({
          page: {
            title: 'Pull requests insights',
            ui: 'team_prs',
            props: {
              referrer: 'dora_metrics',
              metric: ChangeTimeModes.LEAD_TIME
            }
          }
        });
      }}
    >
      <FlexBox col gap1 flexGrow={1} minHeight={'15em'}>
        <FlexBox justifyBetween paddingX={2} alignCenter>
          <FlexBox gap1 alignCenter justifyBetween fullWidth>
            <FlexBox alignCenter gap1>
              <Line white huge bold py={1}>
                Lead Time for Changes
              </Line>
              <FlexBox
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <MetricExternalRead
                  link={`https://www.middlewarehq.com/blog/lead-time-optimization-101-unlock-software-engineering-efficiency`}
                  label={'Lead Time for Changes'}
                >
                  {isSufficientDataAvailable &&
                    !isAllAssignedReposHaveDeploymentsConfigured && (
                      <FlexBox
                        color="white"
                        title={
                          <FlexBox col gap={1}>
                            <Line medium bold white>
                              Insight based on data from{' '}
                              {reposCountWithWorkflowConfigured} out of{' '}
                              {allAssignedRepos.length}{' '}
                              {pluralize('repo', allAssignedRepos.length)} which
                              have workflow configured.
                            </Line>
                            <Line medium>
                              Following{' '}
                              {pluralize(
                                'repo',
                                reposWithNoDeploymentsConfigured.length
                              )}{' '}
                              {reposWithNoDeploymentsConfigured.length > 1
                                ? "don't"
                                : "doesn't"}{' '}
                              have any workflow assigned :
                              <List sx={{ listStyleType: 'disc' }}>
                                {reposWithNoDeploymentsConfigured.map((r) => (
                                  <ListItem
                                    key={r.id}
                                    sx={{
                                      color: darken('#FFF', 0.25),
                                      display: 'list-item',
                                      padding: '0px',
                                      marginLeft: '6px'
                                    }}
                                  >
                                    {r.name}
                                  </ListItem>
                                ))}
                              </List>
                            </Line>
                            {!isEng && (
                              <Link passHref href={ROUTES.INTEGRATIONS.PATH}>
                                <Button
                                  size="small"
                                  endIcon={
                                    <ArrowForwardRounded fontSize="inherit" />
                                  }
                                  variant="outlined"
                                  sx={{ width: 'fit-content' }}
                                >
                                  Configure deployment workflows here
                                </Button>
                              </Link>
                            )}
                          </FlexBox>
                        }
                        darkTip
                      >
                        <WarningAmberRounded
                          sx={{ fontSize: '1.4em' }}
                          color="warning"
                        />
                      </FlexBox>
                    )}
                  {isSufficientDataAvailable &&
                    isAllAssignedReposHaveDeploymentsConfigured && (
                      <FlexBox
                        color="white"
                        title={
                          <FlexBox col gap={1}>
                            <Line small bold white>
                              All assigned{' '}
                              {pluralize('repo', allAssignedRepos.length)} have
                              deployment configured.
                            </Line>
                            {!isEng && (
                              <Link passHref href={ROUTES.INTEGRATIONS.PATH}>
                                <Button
                                  size="small"
                                  endIcon={
                                    <ArrowForwardRounded fontSize="inherit" />
                                  }
                                  variant="outlined"
                                  sx={{ width: 'fit-content' }}
                                >
                                  Modify deployment workflows here
                                </Button>
                              </Link>
                            )}
                          </FlexBox>
                        }
                        darkTip
                      >
                        <CheckCircleOutlineRoundedIcon
                          sx={{ fontSize: '1.4em' }}
                          color="success"
                        />
                      </FlexBox>
                    )}
                </MetricExternalRead>
              </FlexBox>
            </FlexBox>
          </FlexBox>

          <FlexBox
            title={
              <FlexBox col gap={1 / 2}>
                <Line medium white>
                  {activeModeProps.tooltip}
                </Line>
                {getDoraLink('How is this determined?')}
              </FlexBox>
            }
            alignCenter
            darkTip
          >
            {showClassificationBadge && (
              <Chip
                sx={{ background: activeModeProps.bg }}
                icon={
                  <FlexBox bgcolor="#0003" round>
                    <activeModeProps.icon sx={{ transform: 'scale(0.8)' }} />
                  </FlexBox>
                }
                label={
                  <Line bold white>
                    {activeModeProps.classification}
                  </Line>
                }
                color="success"
              />
            )}
          </FlexBox>
        </FlexBox>
        {Boolean(selectedContributors.length) && (
          // CLUSTOX: this card's number is filtered by PR author, while
          // Deployment Frequency is filtered by deploy actor -- often a
          // different person. Naming the relationship here is what keeps
          // the two cards disagreeing from reading as a bug.
          <Line small secondary paddingX={2} mt={-1}>
            authored by {selectedContributors.join(', ')}
          </Line>
        )}
        {leadTimeBenchmarkCaption && (
          <Line
            small
            paddingX={2}
            mt={-1}
            color={
              leadTimeBenchmarkCaption.tone === 'good' ? 'success' : 'warning'
            }
          >
            {leadTimeBenchmarkCaption.text}
          </Line>
        )}
        <FlexBox col justifyBetween relative fullWidth flexGrow={1}>
          <FlexBox height={'100%'} sx={{ justifyContent: 'flex-end' }}>
            {isSufficientDataAvailable ? (
              <Chart2
                id="lead-time-for-changes"
                type="line"
                series={series}
                options={chartOptions}
              />
            ) : (
              <NoDataImg />
            )}
          </FlexBox>

          {/* CLUSTOX: pointer events pass through to the canvas so the
              chart's tooltip can fire; the content column re-enables them so
              its own pills, links and tooltips keep working. Card click is
              unaffected -- it lives on CardRoot, above both. */}
          <FlexBox
            position="absolute"
            fill
            col
            paddingX={2}
            gap1
            justifyCenter
            sx={{ pointerEvents: 'none', '& > *': { pointerEvents: 'auto' } }}
          >
            {isSufficientDataAvailable ? (
              <FlexBox justifyCenter sx={{ width: '100%' }} col>
                <Line bigish medium color={activeModeProps.color}>
                  {'Avg. lead time'}
                </Line>
                <FlexBox gap={2} alignCenter>
                  <Line
                    bold
                    color={activeModeProps.color}
                    sx={{ fontSize: '3em' }}
                  >
                    {getDurationString(leadTimeDuration) || 0}
                  </Line>
                  {Boolean(activeModeProps.count || prevChangeTime) && (
                    <DoraMetricsComparisonPill
                      val={activeModeProps.count}
                      against={prevChangeTime}
                      prevFormat={(val) => `${getDurationString(val) || 0}`}
                      positive={false}
                      boxed
                      light
                      size="1.2em"
                      lineProps={{ bold: false, fontWeight: 600 }}
                      sx={{ marginBottom: '-8px' }}
                    />
                  )}
                </FlexBox>
                <FlexBox justifyBetween>
                  <Line
                    small
                    medium
                    pointer
                    onClick={() => {
                      track('DORA_METRICS_SEE_DETAILS_CLICKED', {
                        viewed: 'CT'
                      });
                      addPage({
                        page: {
                          title: 'Pull requests insights',
                          ui: 'team_prs',
                          props: {
                            referrer: 'dora_metrics',
                            metric: ChangeTimeModes.LEAD_TIME
                          }
                        }
                      });
                    }}
                    color={activeModeProps.color}
                  >
                    <Line underline dotted>
                      See details
                    </Line>{' '}
                    {'->'}
                  </Line>
                </FlexBox>
              </FlexBox>
            ) : isCodeProviderIntegrationEnabled ? (
              <Line huge display="flex" whiteSpace="pre" alignItems="center">
                <ErrorOutlineRoundedIcon /> Insufficient data
              </Line>
            ) : (
              <MissingDORAProviderLink type="CODE" />
            )}
          </FlexBox>
        </FlexBox>
      </FlexBox>
    </CardRoot>
  );
};
