import { ArrowDownwardRounded } from '@mui/icons-material';
import { Card, Divider, useTheme, Collapse, Box } from '@mui/material';
import pluralize from 'pluralize';
import { ascend, descend, groupBy, path, prop, sort } from 'ramda';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { DoraMetricsTrend } from '../DoraMetrics/DoraMetricsTrend';
import { DoraMetricsDuration } from '../DoraMetrics/DoraMetricsDuration';
import { FlexBox } from '@/components/FlexBox';
import { MiniButton } from '@/components/MiniButton';
import { MiniCircularLoader } from '@/components/MiniLoader';
import { ProgressBar } from '@/components/ProgressBar';
import { PullRequestsTableMini } from '@/components/PRTableMini/PullRequestsTableMini';
import Scrollbar from '@/components/Scrollbar';
import { Tabs, TabItem } from '@/components/Tabs';
import { Line } from '@/components/Text';
import { FetchState } from '@/constants/ui-states';
import { useAuth } from '@/hooks/useAuth';
import { useBoolState, useEasyState } from '@/hooks/useEasyState';
import {
  useSingleTeamConfig,
  useCurrentDateRangeReactNode,
  useBranchesForPrFilters
} from '@/hooks/useStateTeamConfig';
import { useTableSort } from '@/hooks/useTableSort';
import {
  doraMetricsSlice,
  fetchDeploymentPRs,
  fetchTeamDeployments
} from '@/slices/dora_metrics';
import { useDispatch, useSelector } from '@/store';
import { Deployment, PR, RepoWorkflowExtended } from '@/types/resources';
import { percent } from '@/utils/datatype';
import { depFn } from '@/utils/fn';
import Link from 'next/link';
import { ROUTES } from '@/constants/routes';
import { DeploymentSources } from '@/types/resources';

import { DeploymentItem } from './DeploymentItem';

enum DepStatusFilter {
  All,
  Pass,
  Fail
}

const hideTableColumns = new Set<keyof PR>(['reviewers', 'rework_cycles']);

enum TabKeys {
  ANALYTICS = 'analytics',
  EVENTS = 'events'
}

export const DeploymentInsightsOverlay = () => {
  const { orgId } = useAuth();
  const { singleTeamId, team, dates } = useSingleTeamConfig();
  const dispatch = useDispatch();
  const depFilter = useEasyState(DepStatusFilter.All);
  const branchesForPrFilters = useBranchesForPrFilters();
  const [activeTab, setActiveTab] = useState<string>(TabKeys.EVENTS);
  const tabItems: TabItem[] = [
    { key: TabKeys.ANALYTICS, label: 'Deployment Analytics' },
    { key: TabKeys.EVENTS, label: 'Deployment Events' }
  ];
  const handleTabSelect = (item: TabItem) => setActiveTab(item.key as string);

  useEffect(() => {
    if (!singleTeamId) return;

    dispatch(
      fetchTeamDeployments({
        team_id: singleTeamId,
        from_date: dates.start,
        to_date: dates.end,
        org_id: orgId,
        ...branchesForPrFilters
      })
    );
  }, [
    branchesForPrFilters,
    dates.end,
    dates.start,
    dispatch,
    orgId,
    singleTeamId
  ]);

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
    if (
      (selectedRepo.value && teamDeployments.repos_map[selectedRepo.value]) ||
      !deploymentsListByRepo.length
    )
      return;

    depFn(selectedRepo.set, deploymentsListByRepo[0].repo.id as ID);
  }, [
    deploymentsListByRepo,
    selectedRepo.set,
    selectedRepo.value,
    teamDeployments.repos_map
  ]);

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
  } = useTableSort(statePrs, { field: 'lead_time', order: 'desc' });

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

  const dateRangeLabel = useCurrentDateRangeReactNode();

  // Determine if the selected repository uses PR_MERGE as its deployment source
  const currentBaseRepo = selectedRepo.value ? teamDeployments.repos_map[selectedRepo.value] : null;
  const isPRMergeSource = currentBaseRepo?.deployment_type === DeploymentSources.PR_MERGE;

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
              border={`1px solid ${repo.id === selectedRepo.value
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
              fontWeight={
                repo.id === selectedRepo.value ? 'bold' : undefined
              }
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
            <Tabs
              items={tabItems}
              onSelect={handleTabSelect}
              checkSelected={(item) => item.key === activeTab}
            />
            {activeTab === TabKeys.ANALYTICS ? (
              <FlexBox col gap={1} p={1}>
                <Divider sx={{ mb: '10px' }} />
                <Box sx={{mb:'10px'}} key={selectedRepo.value}>
                  <FlexBox col gap={1 / 2}>
                    <Line white medium>
                      <Line bold white>
                        No. of deployments {'->'}
                      </Line>{' '}
                      <Line
                        bold
                        color="info"
                        onClick={() => {
                          depFilter.set(DepStatusFilter.All);
                        }}
                      >
                        {deployments.length}
                      </Line>{' '}
                      {Boolean(failedDeps.length) ? (
                        <Line
                          bold
                          color="warning"
                          onClick={() => {
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
                        depFilter.set(DepStatusFilter.Pass);
                      }}
                      remainingOnClick={() => {
                        depFilter.set(DepStatusFilter.Fail);
                      }}
                    />
                  </FlexBox>
                </Box>
                {!isPRMergeSource ? (
                  <>
                    <FlexBox>
                      <DoraMetricsDuration deployments={deployments} />
                    </FlexBox>
                    <FlexBox></FlexBox>
                    <DoraMetricsTrend />
                  </>
                ) : (
                  <Box sx={{ mb: '10px' }}>
                    <Line small white>
                      Deployment trends are only available for repos with workflows as source.{' '}
                      <Link href={ROUTES.TEAMS.ROUTE.PATH} passHref>
                        <Line component="a" small color="primary" bold underline pointer>
                          Go to settings →
                        </Line>
                      </Link>
                    </Line>
                  </Box>
                )}
              </FlexBox>
            ) : (
              <>
                <FlexBox col flex1>
                <Divider sx={{ mt: '10px' }} />
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
                      <FlexBox col justifyContent="center" p={4} fullWidth>
                        <Line big white medium textAlign="center">
                          Select a deployment on the left
                        </Line>
                        <Line white medium textAlign="center">
                          to view PRs included in that deployment
                        </Line>
                      </FlexBox>
                    )}
                  </FlexBox>
                </FlexBox>
              </>
            )}
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
