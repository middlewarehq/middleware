import {
  ArrowDownwardRounded,
  TrendingDown,
  TrendingUp
} from '@mui/icons-material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import {
  Box,
  Card,
  Divider,
  Tab,
  useTheme,
  alpha,
  Collapse
} from '@mui/material';
import { format, startOfDay } from 'date-fns';
import { secondsInMinute } from 'date-fns/constants';
import pluralize from 'pluralize';
import {
  ascend,
  descend,
  groupBy,
  head,
  mapObjIndexed,
  mean,
  path,
  prop,
  sort
} from 'ramda';
import { FC, useCallback, useEffect, useMemo } from 'react';

import { Chart2, ChartOptions } from '@/components/Chart2';
import { FlexBox } from '@/components/FlexBox';
import { MiniButton } from '@/components/MiniButton';
import { MiniCircularLoader } from '@/components/MiniLoader';
import { ProgressBar } from '@/components/ProgressBar';
import { PullRequestsTableMini } from '@/components/PRTableMini/PullRequestsTableMini';
import Scrollbar from '@/components/Scrollbar';
import { Line } from '@/components/Text';
import { FetchState } from '@/constants/ui-states';
import { useBoolState, useEasyState } from '@/hooks/useEasyState';
import {
  useStateBranchConfig,
  useSingleTeamConfig,
  useCurrentDateRangeReactNode
} from '@/hooks/useStateTeamConfig';
import { useTableSort } from '@/hooks/useTableSort';
import {
  doraMetricsSlice,
  fetchDeploymentPRs,
  fetchTeamDeployments
} from '@/slices/dora_metrics';
import { useDispatch, useSelector } from '@/store';
import { brandColors } from '@/theme/schemes/theme';
import {
  Deployment,
  PR,
  RepoWorkflowExtended,
  DeploymentSources
} from '@/types/resources';
import { percent } from '@/utils/datatype';
import { getDurationString } from '@/utils/date';
import { depFn } from '@/utils/fn';
import { trend } from '@/utils/trend';

import { DeploymentItem } from './DeploymentItem';

enum InsightView {
  PrView = 'pr',
  AnalyticsView = 'analytics'
}

enum DepStatusFilter {
  All,
  Pass,
  Fail
}

const hideTableColumns = new Set<keyof PR>(['reviewers', 'rework_cycles']);

export const DeploymentInsightsOverlay = () => {
  const { singleTeamId, team, dates } = useSingleTeamConfig();
  const branches = useStateBranchConfig();
  const dispatch = useDispatch();
  const depFilter = useEasyState(DepStatusFilter.All);

  useEffect(() => {
    if (!singleTeamId) return;

    dispatch(
      fetchTeamDeployments({
        team_id: singleTeamId,
        from_date: dates.start,
        to_date: dates.end
      })
    );
  }, [branches, dates.end, dates.start, dispatch, singleTeamId]);

  const teamDeployments = useSelector((s) => s.doraMetrics.team_deployments);
  const workflowsMap = useSelector(
    (s) => s.doraMetrics.team_deployments.workflows_map
  );

  const deploymentsListByRepo = useMemo(() => {
    return sort(
      descend((r) => r.deps.length),
      Object.entries(teamDeployments.deployments_map).map(
        ([repo_id, deps]) => ({
          repo: teamDeployments.repos_map[repo_id],
          deps
        })
      )
    );
  }, [teamDeployments.deployments_map, teamDeployments.repos_map]);

  const loadingRepos = useSelector(
    (s) => s.doraMetrics.requests?.team_deployments === FetchState.REQUEST
  );

  const selectedRepo = useEasyState<ID | null>(null);

  useEffect(() => {
    if (selectedRepo.value || !deploymentsListByRepo.length) return;

    depFn(selectedRepo.set, deploymentsListByRepo[0].repo.id as ID);
  }, [deploymentsListByRepo, selectedRepo.set, selectedRepo.value]);

  const deployments = useMemo(() => {
    if (!selectedRepo.value) return [];
    return teamDeployments.deployments_map?.[selectedRepo.value] || [];
  }, [selectedRepo.value, teamDeployments.deployments_map]);

  const selectedDepID = useEasyState<ID | null>(null);
  const selectedDep = useMemo(() => {
    return deployments.find((dep) => dep.id === selectedDepID.value);
  }, [deployments, selectedDepID.value]);

  const statePrs = useSelector((s) => s.doraMetrics.deploymentPrs);
  const loadingPrs = useSelector(
    (s) => s.doraMetrics.requests?.deploymentPrs === FetchState.REQUEST
  );

  const theme = useTheme();

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_APP_ENVIRONMENT === 'development') return;
    dispatch(doraMetricsSlice.actions.resetDeployments());
  }, [dispatch]);

  const {
    sortedList: prs,
    updateSortConf,
    conf
  } = useTableSort(statePrs, { field: 'cycle_time', order: 'desc' });

  const selectedTab = useEasyState(InsightView.AnalyticsView);

  const { longestDeployment, shortestDeployment } = useMemo(() => {
    const run_durations = deployments
      .filter((d) => d?.status === 'SUCCESS')
      .map((d) => d.run_duration);
    const min_duration = Math.min(...run_durations);
    const max_duration = Math.max(...run_durations);

    const longestDeployment = deployments.find(
      (dep) => dep.run_duration === max_duration
    );
    const shortestDeployment = deployments.find(
      (dep) => dep.run_duration === min_duration
    );

    return { longestDeployment, shortestDeployment };
  }, [deployments]);

  const selectDeployment = useCallback(
    (dep: Deployment) => {
      selectedDepID.set(dep.id);
      dispatch(fetchDeploymentPRs({ deployment_id: dep.id }));
    },
    [dispatch, selectedDepID]
  );

  const successfulDeps = useMemo(
    () => deployments.filter((dep) => dep.status === 'SUCCESS'),
    [deployments]
  );

  const failedDeps = useMemo(
    () => deployments.filter((dep) => dep.status === 'FAILURE'),
    [deployments]
  );

  const filteredDeployments = useMemo(() => {
    if (depFilter.value === DepStatusFilter.Fail) return failedDeps;
    if (depFilter.value === DepStatusFilter.Pass) return successfulDeps;
    return deployments;
  }, [depFilter.value, deployments, failedDeps, successfulDeps]);

  type GroupedDeployments = [RepoWorkflowExtended, Deployment[]];
  const groupedDeployments: GroupedDeployments[] = useMemo(() => {
    const deploymentsGroupedByWorkflowIds = groupBy(
      prop('repo_workflow_id'),
      filteredDeployments
    );

    const groupedDeploymentsEntries = Object.entries(
      deploymentsGroupedByWorkflowIds
    );

    const workflowDeploymentTuples = groupedDeploymentsEntries.map(
      ([workflowId, deployments]) =>
        [workflowsMap[workflowId] || {}, deployments] as GroupedDeployments
    );

    return sort(
      ascend(path([0, 'name'])),
      workflowDeploymentTuples
    ) as GroupedDeployments[];
  }, [filteredDeployments, workflowsMap]);

  const [depDates, depRuntimes, depPrs] = useMemo(() => {
    const grouped = groupBy<Deployment>(
      (a) => String(startOfDay(new Date(a.conducted_at)).getTime()),
      successfulDeps
    );

    const averaged = mapObjIndexed(
      (deps) => ({
        run: mean(deps.map((dep) => dep.run_duration)),
        prs: Math.round(mean(deps.map((dep) => dep.pr_count)))
      }),
      grouped
    );

    const entries: [Date, number, number][] = Object.entries(averaged)
      .reverse()
      .map(([ts_string, params]) => [
        new Date(Number(ts_string)),
        params.run,
        Math.max(params.prs, 0)
      ]);

    return [
      entries.map((e) => format(e[0], 'do MMM')),
      entries.map((e) => e[1]),
      entries.map((e) => e[2])
    ];
  }, [successfulDeps]);

  const trends = useMemo(() => {
    return {
      run: trend(depRuntimes).change / 100,
      prs: trend(depPrs).change / 100
    };
  }, [depPrs, depRuntimes]);

  const dateRangeLabel = useCurrentDateRangeReactNode();

  const showDeploymentTrends = useMemo(() => {
    return head(deployments)?.id.includes(DeploymentSources.WORKFLOW);
  }, [deployments]);

  if (!team) return <Line>Please select a team first...</Line>;

  return (
    <FlexBox col gap1 flex1>
      <FlexBox col gap1>
        <Line white bold sx={{ fontSize: '1.1em' }}>
          Select a repo for team: <Line color="info">{team.name}</Line>
        </Line>
        <Line>
          Deployments and stats will be shown between {dateRangeLabel}
        </Line>
      </FlexBox>
      <FlexBox gap1 wrap>
        {loadingRepos ? (
          <MiniCircularLoader label="Loading repos..." />
        ) : (
          deploymentsListByRepo.map(({ repo, deps }) => (
            <FlexBox
              centered
              gap={1 / 2}
              key={repo.id}
              px={1}
              py={1 / 2}
              corner={theme.spacing(1)}
              border={`1px solid ${
                repo.id === selectedRepo.value
                  ? theme.colors.info.main
                  : theme.colors.secondary.light
              }`}
              pointer
              bgcolor={
                repo.id === selectedRepo.value
                  ? theme.colors.info.lighter
                  : undefined
              }
              color={
                repo.id === selectedRepo.value
                  ? theme.colors.info.main
                  : undefined
              }
              fontWeight={repo.id === selectedRepo.value ? 'bold' : undefined}
              onClick={() => {
                selectedRepo.set(repo.id as ID);
              }}
            >
              <Line>{repo.name}</Line>{' '}
              {Boolean(deps.length) && (
                <FlexBox
                  round
                  bgcolor={theme.colors.secondary.lighter}
                  border={`1px solid currentColor`}
                  centered
                  px={1 / 2}
                  py={1 / 4}
                  title={`${repo.name} has ${deps.length} ${pluralize(
                    'deployment',
                    deps.length
                  )}`}
                >
                  <Line fontSize="0.7em" lineHeight={1}>
                    {deps.length}
                  </Line>
                </FlexBox>
              )}
            </FlexBox>
          ))
        )}
      </FlexBox>
      <Divider />
      {selectedRepo.value && !loadingRepos ? (
        !deployments?.length ? (
          <Line>
            There are no deployments for this repo from {dateRangeLabel}
          </Line>
        ) : (
          <FlexBox
            component={Card}
            fullWidth
            p={1}
            flex1
            col
            sx={{
              '.MuiTabPanel-root': { p: 0, flex: 1 }
            }}
            minHeight={'calc(100vh - 275px)'}
          >
            <FlexBox col flex1>
              <TabContext value={selectedTab.value}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <TabList onChange={(_, v) => selectedTab.set(v)} color="info">
                    <Tab
                      label={
                        <Line white sx={{ fontWeight: 600 }}>
                          Deployment Analytics
                        </Line>
                      }
                      value={InsightView.AnalyticsView}
                      color="info"
                    />
                    <Tab
                      label={
                        <Line white sx={{ fontWeight: 600 }}>
                          Deployment Events
                        </Line>
                      }
                      value={InsightView.PrView}
                    />
                  </TabList>
                </Box>
                {Boolean(longestDeployment && shortestDeployment) && (
                  <TabPanel value={InsightView.AnalyticsView}>
                    <FlexBox gap={2} p={1} col>
                      <FlexBox col gap={1 / 2}>
                        <Line white medium>
                          <Line bold white>
                            No. of deployments {'->'}
                          </Line>{' '}
                          <Line
                            bold
                            color="info"
                            onClick={() => {
                              selectedTab.set(InsightView.PrView);
                              depFilter.set(DepStatusFilter.All);
                            }}
                            pointer
                          >
                            {deployments.length}
                          </Line>{' '}
                          {Boolean(failedDeps.length) ? (
                            <Line
                              bold
                              color="warning"
                              onClick={() => {
                                selectedTab.set(InsightView.PrView);
                                depFilter.set(DepStatusFilter.Fail);
                              }}
                              pointer
                            >
                              ({failedDeps.length} failed)
                            </Line>
                          ) : (
                            <Line
                              bold
                              color="success"
                              onClick={() => {
                                selectedTab.set(InsightView.PrView);
                                depFilter.set(DepStatusFilter.Pass);
                              }}
                              pointer
                            >
                              (All passed)
                            </Line>
                          )}
                        </Line>
                        <ProgressBar
                          mt={1}
                          perc={percent(
                            successfulDeps.length,
                            deployments.length
                          )}
                          height="12px"
                          maxWidth="300px"
                          progressTitle="Successful deployments"
                          remainingTitle="Failed deployments"
                          progressOnClick={() => {
                            selectedTab.set(InsightView.PrView);
                            depFilter.set(DepStatusFilter.Pass);
                          }}
                          remainingOnClick={() => {
                            selectedTab.set(InsightView.PrView);
                            depFilter.set(DepStatusFilter.Fail);
                          }}
                        />
                      </FlexBox>
                      {longestDeployment.id !== shortestDeployment.id && (
                        <FlexBox gap1>
                          <FlexBox col gap1>
                            <Line medium white>
                              Longest Deployment
                            </Line>
                            <DeploymentItem
                              dep={longestDeployment}
                              onSelect={() => {
                                selectDeployment(longestDeployment);
                                selectedTab.set(InsightView.PrView);
                              }}
                            />
                          </FlexBox>
                          <FlexBox col gap1>
                            <Line medium white>
                              Shortest Deployment
                            </Line>
                            <DeploymentItem
                              dep={shortestDeployment}
                              onSelect={() => {
                                selectDeployment(shortestDeployment);
                                selectedTab.set(InsightView.PrView);
                              }}
                            />
                          </FlexBox>
                        </FlexBox>
                      )}
                      {showDeploymentTrends ? (
                        <FlexBox col gap1>
                          <Line white bold>
                            Deployment trends
                          </Line>
                          <FlexBox
                            gap1
                            sx={{
                              ':empty': { display: 'none' },
                              '> div': {
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1 / 2,
                                px: 1,
                                py: 1 / 2,
                                borderRadius: 1 / 2,
                                border: `1px solid #FFF5`
                              }
                            }}
                          >
                            {Boolean(
                              !trends?.run || Math.abs(trends?.run) < 0.02
                            ) ? null : trends?.run > 0 ? (
                              <FlexBox>
                                <Line white small>
                                  Increasing deployment duration
                                </Line>
                                <FlexBox alignCenter>
                                  <Line color="warning" bold small>
                                    {Math.round(trends.run * 100)}%
                                  </Line>
                                  <TrendingUp
                                    fontSize="inherit"
                                    color="warning"
                                  />
                                </FlexBox>
                              </FlexBox>
                            ) : (
                              <FlexBox>
                                <Line white small>
                                  Decreasing deployment duration
                                </Line>
                                <FlexBox alignCenter>
                                  <Line color="success" bold small>
                                    {Math.round(trends.run * 100)}%
                                  </Line>
                                  <TrendingDown
                                    fontSize="inherit"
                                    color="success"
                                  />
                                </FlexBox>
                              </FlexBox>
                            )}
                            {Boolean(
                              !trends?.prs ||
                                !Number.isFinite(trends?.prs) ||
                                Math.abs(trends?.prs) < 0.05
                            ) ? null : trends?.prs > 0 ? (
                              <FlexBox>
                                <Line white small>
                                  Increasing PR count per deployment
                                </Line>
                                <FlexBox alignCenter>
                                  <Line color="warning" bold small>
                                    {Math.round(trends.prs * 100)}%
                                  </Line>
                                  <TrendingUp
                                    fontSize="inherit"
                                    color="warning"
                                  />
                                </FlexBox>
                              </FlexBox>
                            ) : (
                              <FlexBox>
                                <Line white small>
                                  Decreasing PR count per deployment
                                </Line>
                                <FlexBox alignCenter>
                                  <Line color="success" bold small>
                                    {Math.round(trends.prs * 100)}%
                                  </Line>
                                  <TrendingDown
                                    fontSize="inherit"
                                    color="success"
                                  />
                                </FlexBox>
                              </FlexBox>
                            )}
                          </FlexBox>
                          <FlexBox height="400px">
                            <Chart2
                              id="deployments-duration"
                              series={[
                                {
                                  data: depRuntimes,
                                  label: 'Deployment Duration',
                                  trendlineLinear:
                                    depRuntimes.length > 1
                                      ? {
                                          lineStyle: 'dotted',
                                          width: 2
                                        }
                                      : undefined
                                },
                                {
                                  data: depPrs,
                                  label: 'PR Count per deployment',
                                  yAxisID: 'prcount',
                                  backgroundColor: alpha(
                                    brandColors.branch.all,
                                    0.5
                                  ),
                                  barThickness: 5,
                                  trendlineLinear:
                                    depPrs.length > 1
                                      ? {
                                          lineStyle: 'dotted',
                                          width: 2,
                                          colorMin: brandColors.branch.all,
                                          colorMax: brandColors.branch.all
                                        }
                                      : undefined
                                }
                              ]}
                              labels={depDates}
                              options={deploymentRuntimeChartOptions}
                            />
                          </FlexBox>
                        </FlexBox>
                      ) : (
                        <FlexBox fullWidth p={1} minHeight={'200px'}>
                          <Line>
                            Deployment trends are only available for repos with
                            workflows as source.
                          </Line>
                        </FlexBox>
                      )}
                    </FlexBox>
                  </TabPanel>
                )}
                <TabPanel value={InsightView.PrView} sx={{ display: 'flex' }}>
                  <FlexBox gap1 flex1 fullWidth>
                    <FlexBox col>
                      <FlexBox p={1} pb={0} gap={1 / 2}>
                        <MiniButton
                          onClick={() => depFilter.set(DepStatusFilter.All)}
                          variant={
                            depFilter.value === DepStatusFilter.All
                              ? 'contained'
                              : 'outlined'
                          }
                        >
                          All
                        </MiniButton>
                        <MiniButton
                          onClick={() => depFilter.set(DepStatusFilter.Pass)}
                          variant={
                            depFilter.value === DepStatusFilter.Pass
                              ? 'contained'
                              : 'outlined'
                          }
                        >
                          Successful
                        </MiniButton>
                        <MiniButton
                          onClick={() => depFilter.set(DepStatusFilter.Fail)}
                          variant={
                            depFilter.value === DepStatusFilter.Fail
                              ? 'contained'
                              : 'outlined'
                          }
                        >
                          Failed
                        </MiniButton>
                      </FlexBox>
                      <Divider sx={{ mt: 1 }} />
                      <FlexBox fill>
                        <Scrollbar autoHeight autoHeightMin="100%">
                          <FlexBox col gap1 p={1}>
                            {filteredDeployments.length ? (
                              groupedDeployments.map(
                                ([workflow, deployments]) => (
                                  <CollapsibleWorkflowList
                                    key={workflow.id}
                                    workflow={workflow}
                                    deployments={deployments}
                                    selectedDeploymentId={selectedDepID.value}
                                    onSelect={selectDeployment}
                                  />
                                )
                              )
                            ) : (
                              <FlexBox alignCenter col textAlign="center">
                                <Line small white>
                                  No deployments matching the current filter.
                                </Line>
                                <Line
                                  small
                                  color="primary"
                                  bold
                                  underline
                                  dotted
                                  onClick={() =>
                                    depFilter.set(DepStatusFilter.All)
                                  }
                                  pointer
                                >
                                  See all deployments?
                                </Line>
                              </FlexBox>
                            )}
                          </FlexBox>
                        </Scrollbar>
                      </FlexBox>
                    </FlexBox>
                    <Divider orientation="vertical" />
                    {selectedDep ? (
                      <FlexBox col p={1} gap1 width={'calc(100% - 320px)'}>
                        <FlexBox col gap1>
                          <Line small>Selected Deployment</Line>
                          <DeploymentItem dep={selectedDep} selected={true} />
                        </FlexBox>
                        <Divider />
                        <FlexBox col gap1 maxWidth={'100%'} overflow={'auto'}>
                          {loadingPrs ? (
                            <MiniCircularLoader label="Loading pull requests..." />
                          ) : prs.length ? (
                            <PullRequestsTableMini
                              prs={prs}
                              updateSortConf={updateSortConf}
                              conf={conf}
                              hideColumns={hideTableColumns}
                            />
                          ) : (
                            <Line small white>
                              No new PRs linked to this deployment.
                            </Line>
                          )}
                        </FlexBox>
                      </FlexBox>
                    ) : (
                      <FlexBox col p={4} fullWidth>
                        <Line big white medium textAlign="center">
                          Select a deployment on the left
                        </Line>
                        <Line white medium textAlign="center">
                          to view PRs included in that deployment
                        </Line>
                      </FlexBox>
                    )}
                  </FlexBox>
                </TabPanel>
              </TabContext>
            </FlexBox>
          </FlexBox>
        )
      ) : (
        <FlexBox>Select a repo to begin...</FlexBox>
      )}
    </FlexBox>
  );
};

const CollapsibleWorkflowList: FC<{
  workflow: RepoWorkflowExtended;
  deployments: Deployment[];
  selectedDeploymentId?: ID;
  onSelect?: (dep: Deployment) => any;
}> = ({ workflow, deployments, onSelect, selectedDeploymentId }) => {
  const isExpanded = useBoolState(true);

  return (
    <FlexBox col gap1 pb={1}>
      <Line
        bold
        onClick={isExpanded.toggle}
        pointer
        display="flex"
        alignItems="center"
        whiteSpace="pre"
      >
        <ArrowDownwardRounded
          fontSize="inherit"
          sx={{
            transition: 'all 0.2s',
            transform: `rotate(${isExpanded.value ? 180 : 0}deg)`
          }}
        />
        &nbsp;
        <Line>
          Workflow: <Line color="info">{workflow.name}</Line>
        </Line>{' '}
        <Line color="info">({deployments.length || 'None'})</Line>
      </Line>
      <Collapse in={isExpanded.value}>
        <FlexBox gap1 col p={'1px'}>
          {deployments.map((dep) => (
            <DeploymentItem
              key={dep.id}
              dep={dep}
              selected={selectedDeploymentId === dep.id}
              onSelect={onSelect}
            />
          ))}
        </FlexBox>
      </Collapse>
    </FlexBox>
  );
};

const deploymentRuntimeChartOptions: ChartOptions = {
  options: {
    scales: {
      y: {
        ticks: {
          stepSize: secondsInMinute * 2,
          callback: (value) => getDurationString(Number(value))
        }
      },
      prcount: {
        type: 'linear',
        position: 'right',
        ticks: {
          stepSize: 1,
          color: brandColors.branch.all
        },
        beginAtZero: true,
        grace: '10%',
        grid: {
          color: alpha(brandColors.branch.all, 0.2),
          borderColor: alpha(brandColors.branch.all, 0.2),
          tickColor: brandColors.branch.all,
          borderDash: [5, 2]
        }
      }
    },
    plugins: {
      zoom: {
        pan: {
          enabled: false
        },
        zoom: {
          drag: {
            enabled: false
          }
        }
      },
      legend: {
        display: true,
        labels: {
          color: 'white'
        }
      },
      tooltip: {
        callbacks: {
          label(tooltipItem) {
            if (tooltipItem.dataset.yAxisID === 'prcount')
              return `${tooltipItem.formattedValue} PRs`;

            return getDurationString(Number(tooltipItem.formattedValue));
          }
        }
      }
    }
  }
};
