import { ArrowForwardRounded, WarningAmberRounded } from '@mui/icons-material';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import {
  alpha,
  Button,
  Chip,
  darken,
  List,
  ListItem,
  Stack
} from '@mui/material';
import Link from 'next/link';
import pluralize from 'pluralize';
import { useMemo } from 'react';

import { Chart2, ChartOptions } from '@/components/Chart2';
import { FlexBox } from '@/components/FlexBox';
import { MiniSwitch } from '@/components/Shared';
import { Line } from '@/components/Text';
import { track } from '@/constants/events';
import { ROUTES } from '@/constants/routes';
import { isRoleLessThanEM } from '@/constants/useRoute';
import {
  CardRoot,
  NoDataImg
} from '@/content/DoraMetrics/DoraCards/sharedComponents';
import {
  getTrendsDataFromArray,
  usePropsForChangeTimeCard
} from '@/content/DoraMetrics/DoraCards/sharedHooks';
import { useAuth } from '@/hooks/useAuth';
import { IntegrationGroup } from '@/types/resources';
import { mergeDateValueTupleArray } from '@/utils/array';
import { getDurationString } from '@/utils/date';

import { DoraMetricsComparisonPill } from '../DoraMetricsComparisonPill';
import { getDoraLink } from '../getDoraLink';
import { MetricExternalRead } from '../MetricExternalRead';
import { MissingDORAProviderLink } from '../MissingDORAProviderLink';

const chartOptions = {
  options: {
    scales: {
      x: {
        display: false
      },
      y: {
        display: false
      }
    },
    events: [],
    plugins: {
      zoom: {
        zoom: {
          drag: {
            enabled: false
          }
        }
      }
    }
  }
} as ChartOptions;

export const ChangeTimeCard = () => {
  const { integrationSet } = useAuth();
  const { role } = useAuth();
  const isEng = isRoleLessThanEM(role);

  const {
    isShowingLeadTime,
    isShowingCycleTime,
    reposCountWithWorkflowConfigured,
    isActiveModeSwitchDisabled,
    isSufficientDataAvailable,
    activeModePrevTrendsData,
    activeModeCurrentTrendsData,
    activeModeProps,
    isAllAssignedReposHaveDeploymentsConfigured,
    allAssignedRepos,
    reposWithNoDeploymentsConfigured,
    prevChangeTime,
    toggleActiveModeValue
  } = usePropsForChangeTimeCard();

  const isCodeProviderIntegrationEnabled = integrationSet.has(
    IntegrationGroup.CODE
  );

  const showClassificationBadge =
    isSufficientDataAvailable && isCodeProviderIntegrationEnabled;

  const series = useMemo(
    () => [
      {
        label: 'Lead Time',
        fill: 'start',
        data: getTrendsDataFromArray(
          mergeDateValueTupleArray(
            activeModePrevTrendsData,
            activeModeCurrentTrendsData
          )
        ).map((point) => point || 0),
        backgroundColor: activeModeProps.backgroundColor,
        borderColor: alpha(activeModeProps.backgroundColor, 0.5),
        lineTension: 0.2
      }
    ],
    [
      activeModeCurrentTrendsData,
      activeModePrevTrendsData,
      activeModeProps.backgroundColor
    ]
  );

  return (
    <CardRoot>
      <FlexBox col gap1 flexGrow={1} minHeight={'15em'}>
        <FlexBox justifyBetween paddingX={2} alignCenter>
          <FlexBox gap1 alignCenter justifyBetween fullWidth>
            <FlexBox alignCenter gap1>
              <Line white huge bold py={1}>
                {isShowingLeadTime ? 'Lead Time for Changes' : 'Cycle Time'}
              </Line>
              <MetricExternalRead
                link={`https://docs.gitlab.com/ee/user/analytics/dora_metrics.html#lead-time-for-changes`}
                label={
                  isShowingLeadTime ? 'Lead Time for Changes' : 'Cycle Time'
                }
              >
                {isShowingLeadTime &&
                  isSufficientDataAvailable &&
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
                {isShowingLeadTime &&
                  isSufficientDataAvailable &&
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

          <FlexBox position="absolute" fill col paddingX={2} gap1 justifyCenter>
            {isSufficientDataAvailable ? (
              <FlexBox justifyCenter sx={{ width: '100%' }} col>
                <Line bigish medium color={activeModeProps.color}>
                  {isShowingLeadTime ? 'Avg. lead time' : 'Avg. cycle time'}
                </Line>
                <FlexBox gap={2} alignCenter>
                  <Line
                    bold
                    color={activeModeProps.color}
                    sx={{ fontSize: '3em' }}
                  >
                    {getDurationString(activeModeProps.count) || 0}
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
                      return console.error('OVERLAY PENDING');
                    }}
                    color={activeModeProps.color}
                  >
                    <Line underline dotted>
                      See details
                    </Line>{' '}
                    {'->'}
                  </Line>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ zIndex: 1 }}
                  >
                    <Line
                      sx={{
                        fontWeight: isShowingCycleTime && 'bold',
                        color: isShowingLeadTime && darken('#FFF', 0.25),
                        opacity: isActiveModeSwitchDisabled && 0.6
                      }}
                    >
                      Cycle Time
                    </Line>
                    <FlexBox
                      title={
                        isActiveModeSwitchDisabled && (
                          <FlexBox alignCenter gap1>
                            {!reposCountWithWorkflowConfigured ? (
                              <FlexBox col gap1>
                                <Line medium>
                                  No assigned repos have deployment workflow
                                  configured.
                                </Line>
                                {!isEng && (
                                  <Link
                                    passHref
                                    href={ROUTES.INTEGRATIONS.PATH}
                                  >
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
                            ) : (
                              <>
                                <WarningAmberRounded
                                  sx={{ fontSize: '1.4em' }}
                                  color="warning"
                                />
                                <Line>No Lead Time data available</Line>
                              </>
                            )}
                          </FlexBox>
                        )
                      }
                      darkTip
                    >
                      <MiniSwitch
                        onChange={toggleActiveModeValue}
                        defaultChecked={!isActiveModeSwitchDisabled}
                        disabled={isActiveModeSwitchDisabled}
                      />
                    </FlexBox>

                    <Line
                      sx={{
                        fontWeight: isShowingLeadTime && 'bold',
                        color: isShowingCycleTime && darken('#FFF', 0.25),
                        opacity: isActiveModeSwitchDisabled && 0.6
                      }}
                    >
                      Lead Time
                    </Line>
                  </Stack>
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
