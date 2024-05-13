import { AccessTimeRounded } from '@mui/icons-material';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import { Box, Card, Chip, Divider, Link, Paper, useTheme } from '@mui/material';
import { format } from 'date-fns';
import pluralize from 'pluralize';
import { head } from 'ramda';
import { FC, useCallback, useEffect, useMemo } from 'react';
import { FaExternalLinkAlt } from 'react-icons/fa';

import { EmptyState } from '@/components/EmptyState';
import { FlexBox } from '@/components/FlexBox';
import { MiniLoader } from '@/components/MiniLoader';
import { useOverlayPage } from '@/components/OverlayPageContext';
import Scrollbar from '@/components/Scrollbar';
import { LightTooltip } from '@/components/Shared';
import { SimpleAvatar } from '@/components/SimpleAvatar';
import { Line } from '@/components/Text';
import { TrendsLineChart } from '@/components/TrendsLineChart';
import { FetchState } from '@/constants/ui-states';
import { DeploymentWithIncidentsMenuItem } from '@/content/DoraMetrics/DeploymentWithIncidentsMenuItem';
import { RevertedPrs } from '@/content/PullRequests/PrsReverted';
import { useAuth } from '@/hooks/useAuth';
import { useDoraMetricsGraph } from '@/hooks/useDoraMetricsGraph';
import { useEasyState } from '@/hooks/useEasyState';
import {
  useCurrentDateRangeReactNode,
  useSingleTeamConfig,
  useStateBranchConfig
} from '@/hooks/useStateTeamConfig';
import { fetchAllDeploymentsWithIncidents } from '@/slices/dora_metrics';
import { useDispatch, useSelector } from '@/store';
import { PrUser, DeploymentWithIncidents } from '@/types/resources';
import { getDurationString } from '@/utils/date';
import { formatAsPercent } from '@/utils/stringFormatting';
import { OPEN_IN_NEW_TAB_PROPS } from '@/utils/url';
import { getGHAvatar } from '@/utils/user';

import { IncidentItemIcon } from './IncidentsMenuItem';

import { SubHeader } from '../../components/WrapperComponents';

export const AllIncidentsBody = () => {
  const dispatch = useDispatch();
  const { orgId } = useAuth();
  const branches = useStateBranchConfig();
  const { singleTeamId, dates, team, singleTeamProdBranchesConfig } =
    useSingleTeamConfig();
  const { addPage } = useOverlayPage();
  const dateRangeLabel = useCurrentDateRangeReactNode();
  const isLoading = useSelector(
    (s) => s.doraMetrics.requests?.all_deployments === FetchState.REQUEST
  );

  const allDeployments = useSelector(
    (s) => s.doraMetrics.all_deployments || []
  );
  const allPrs = useSelector((s) => s.doraMetrics.summary_prs);
  const revertedPrs = useSelector((s) => s.doraMetrics.revert_prs);

  const selectedDeploymentId = useEasyState<ID>(null);
  const setSelectedDeploymentId = useCallback(
    (selectedDeployment: DeploymentWithIncidents) => {
      selectedDeploymentId.set(selectedDeployment.id);
    },
    [selectedDeploymentId]
  );

  const selectedDeployment = useMemo(
    () =>
      allDeployments.find(
        (deployment) => deployment.id === selectedDeploymentId.value
      ),
    [allDeployments, selectedDeploymentId]
  );
  const filteredDeployments = useMemo(
    () => allDeployments.filter((deployment) => deployment.incidents.length),
    [allDeployments]
  );

  const fetchAllIncidentDetails = useCallback(() => {
    if (!singleTeamId || !dates.start || !dates.end) return;

    dispatch(
      fetchAllDeploymentsWithIncidents({
        team_id: singleTeamId,
        from_date: dates.start,
        to_date: dates.end,
        branches,
        repo_filters: singleTeamProdBranchesConfig,
        org_id: orgId
      })
    );
  }, [
    branches,
    dates.end,
    dates.start,
    dispatch,
    orgId,
    singleTeamId,
    singleTeamProdBranchesConfig
  ]);

  useEffect(() => {
    fetchAllIncidentDetails();
  }, [
    branches,
    dates.end,
    dates.start,
    dispatch,
    fetchAllIncidentDetails,
    orgId,
    singleTeamId,
    singleTeamProdBranchesConfig
  ]);

  const { trendsSeriesMap } = useDoraMetricsGraph();
  const isTrendSeriesAvailable = head(
    trendsSeriesMap?.changeFailureRateTrends || []
  )?.data?.some((s) => s.y);

  if (isLoading) return <MiniLoader label="Fetching incidents ..." />;
  if (!allDeployments.length || !isTrendSeriesAvailable)
    return (
      <EmptyState>
        <Box>
          No resolved incidents found for <Line color="info">{team.name}</Line>{' '}
          from {dateRangeLabel}
        </Box>
      </EmptyState>
    );

  return (
    <FlexBox col gap1 flex1>
      <Card sx={{ my: 2, pt: 2, px: 2, pb: 2 }}>
        <SubHeader big>Change failure rate, across weeks</SubHeader>
        <Divider sx={{ mt: 2, mb: isTrendSeriesAvailable ? 4 : 2 }} />
        {isTrendSeriesAvailable ? (
          <FlexBox fullWidth height={'300px'} alignCenter justifyCenter p={1}>
            <TrendsLineChart
              series={trendsSeriesMap.changeFailureRateTrends}
              yFormat={formatAsPercent}
              axisLeft={{ format: formatAsPercent }}
            />
          </FlexBox>
        ) : (
          <Line>Not enough data to show trends.</Line>
        )}
      </Card>
      <FlexBox col gap1>
        {Boolean(revertedPrs.length) && (
          <>
            <FlexBox gap={2}>
              <RevertedPrs
                id="process-body-reverted-prs"
                prs={allPrs}
                revertedPrs={revertedPrs}
                titleProps={{ big: true, mb: 1 }}
                prUpdateCallback={fetchAllIncidentDetails}
              />
            </FlexBox>
            <Divider />
          </>
        )}
        <Line>
          Out of{' '}
          <Line
            small
            medium
            pointer
            onClick={() => {
              addPage({
                page: {
                  title: 'Deployments insights',
                  ui: 'deployment_freq'
                }
              });
            }}
            color="info"
          >
            <Line underline bold>
              {allDeployments.length} total{' '}
              {pluralize('deployment', allDeployments.length)}
            </Line>
          </Line>{' '}
          from {dateRangeLabel} across all data sources,{' '}
          {filteredDeployments.length}{' '}
          {pluralize('deployment', filteredDeployments.length)} may have led to
          possible incidents.
        </Line>
      </FlexBox>
      <Divider />
      <FlexBox gap1 flex1 fullWidth component={Paper} minHeight="75vh">
        <FlexBox col>
          <FlexBox flexGrow={1}>
            <Scrollbar autoHeight autoHeightMin="100%">
              <FlexBox col gap1 p={1} flexGrow={1}>
                {filteredDeployments?.map((deployment) => {
                  return (
                    <DeploymentWithIncidentsMenuItem
                      deployment={deployment}
                      key={deployment.id}
                      onSelect={setSelectedDeploymentId}
                      selected={selectedDeploymentId.value === deployment.id}
                    />
                  );
                })}
              </FlexBox>
            </Scrollbar>
          </FlexBox>
        </FlexBox>
        <Divider orientation="vertical" />
        <SelectedIncidentDetails deploymentDetails={selectedDeployment} />
      </FlexBox>
    </FlexBox>
  );
};

const SelectedIncidentDetails: FC<{
  deploymentDetails: DeploymentWithIncidents;
}> = ({ deploymentDetails }) => {
  const theme = useTheme();

  const incidents = deploymentDetails?.incidents;
  const isAssigned =
    deploymentDetails?.event_actor?.username ||
    deploymentDetails?.event_actor?.linked_user;

  if (!deploymentDetails)
    return (
      <FlexBox col p={4} fullWidth>
        <Line big white medium textAlign="center">
          Select an deployment on the left
        </Line>
        <Line white medium textAlign="center">
          to view details of possible incidents that it may have led to
        </Line>
      </FlexBox>
    );

  return (
    <FlexBox
      col
      p={2}
      fullWidth
      gap1
      sx={{
        wordBreak: 'break-word'
      }}
    >
      <Line>Selected Deployment</Line>
      <FlexBox
        gap={2}
        alignCenter
        component={Card}
        p={2}
        sx={{ border: `2px solid ${theme.colors.info.main}` }}
      >
        {Boolean(deploymentDetails.pr_count) && (
          <FlexBox
            alignCenter
            gap={1 / 4}
            title={`This deployment included ${deploymentDetails.pr_count} ${
              deploymentDetails.pr_count === 1 ? 'PR' : 'PRs'
            }`}
            tooltipPlacement="left"
          >
            <BugReportOutlinedIcon fontSize="inherit" />
            <Line small>
              {deploymentDetails.pr_count}{' '}
              {deploymentDetails.pr_count === 1 ? 'PR' : 'PRs'}
            </Line>
          </FlexBox>
        )}
        <FlexBox alignCenter gap={1 / 2} flexGrow={1}>
          <Line medium>
            Run on{' '}
            {format(
              new Date(deploymentDetails.conducted_at),
              'do, MMM - hh:mmaaa'
            )}
          </Line>
          <FlexBox flexGrow={1} alignCenter gap1>
            <Line medium>
              by{' '}
              {deploymentDetails.event_actor?.linked_user?.name ||
                `@${deploymentDetails.event_actor.username}`}{' '}
            </Line>
            <Box>
              <IncidentUserAvatar
                userDetails={deploymentDetails.event_actor}
                size={3}
              />
            </Box>
          </FlexBox>
        </FlexBox>
        <FlexBox gap1 alignCenter>
          <Chip
            size="small"
            label={
              <FlexBox
                alignCenter
                gap={1 / 4}
                title={`This deployment took ${getDurationString(
                  deploymentDetails.run_duration
                )} to run`}
                tooltipPlacement="right"
              >
                <AccessTimeRounded fontSize="inherit" />
                <Line small>
                  {getDurationString(deploymentDetails.run_duration)}
                </Line>
              </FlexBox>
            }
          />

          {deploymentDetails.html_url && (
            <Link href={deploymentDetails.html_url} {...OPEN_IN_NEW_TAB_PROPS}>
              <Line
                medium
                white
                sx={{
                  transform: 'scale(0.9)',
                  transition: 'all 0.2s',
                  ':hover': { color: 'info.main' }
                }}
              >
                <FaExternalLinkAlt />
              </Line>
            </Link>
          )}
        </FlexBox>
      </FlexBox>
      <Divider />
      {incidents.map((incident) => (
        <FlexBox
          key={incident.id}
          justifyBetween
          p={2}
          component={Card}
          col
          gap1
          justifyCenter
        >
          <FlexBox justifyBetween alignCenter>
            <Line bold medium>
              Incident details
            </Line>
            <FlexBox gap={2} alignCenter>
              <Chip
                label={
                  <LightTooltip
                    arrow
                    title={`Assigned to ${
                      incident.assigned_to?.linked_user?.name ||
                      incident.assigned_to?.username ||
                      'No-one'
                    }`}
                  >
                    <Box
                      display="flex"
                      alignItems="center"
                      gap={1}
                      width="100%"
                    >
                      {isAssigned ? (
                        <FlexBox gap1 alignCenter>
                          Assignee{' '}
                          <SimpleAvatar
                            name={
                              incident.assigned_to.linked_user?.name ||
                              incident.assigned_to.username
                            }
                            size={theme.spacing(2.5)}
                            url={incident.assigned_to?.linked_user?.avatar_url}
                          />
                        </FlexBox>
                      ) : (
                        <FlexBox gap1 alignCenter>
                          Unassigned
                        </FlexBox>
                      )}
                    </Box>
                  </LightTooltip>
                }
                variant="filled"
              />
              <Chip
                label={
                  <LightTooltip
                    arrow
                    title={
                      <Box sx={{ textTransform: 'capitalize' }}>
                        {incident.status} on{' '}
                        {format(
                          new Date(
                            incident.resolved_date ||
                              incident.acknowledged_date ||
                              incident.creation_date
                          ),
                          'do MMMM'
                        )}
                      </Box>
                    }
                  >
                    <Box
                      display="flex"
                      alignItems="center"
                      gap={1}
                      width="100%"
                    >
                      <FlexBox
                        gap1
                        alignCenter
                        sx={{ textTransform: 'capitalize' }}
                      >
                        {incident.status}
                        <IncidentItemIcon status={incident.status} />
                      </FlexBox>
                    </Box>
                  </LightTooltip>
                }
                variant="filled"
              />
              <Link href={incident.url} {...OPEN_IN_NEW_TAB_PROPS}>
                <Line
                  sx={{
                    transform: 'scale(0.9)',
                    transition: 'all 0.2s',
                    ':hover': { color: 'info.main' }
                  }}
                  white
                  medium
                >
                  <FaExternalLinkAlt />
                </Line>
              </Link>
            </FlexBox>
          </FlexBox>

          <Divider />

          <FlexBox justifyBetween gap={2}>
            <Line big white medium>
              {incident.title}
            </Line>
          </FlexBox>
          <Line
            tiny
            sx={{
              whiteSpace: 'pre-line'
            }}
          >
            {incident.summary}
          </Line>
        </FlexBox>
      ))}
    </FlexBox>
  );
};

const IncidentUserAvatar: FC<{
  userDetails: PrUser;
  size?: number;
}> = ({ userDetails, size }) => {
  const { org } = useAuth();
  const theme = useTheme();
  const hasGithub = org.integrations.github;
  return (
    <LightTooltip
      arrow
      title={
        <Box>
          <Box>{`@${userDetails.username}`}</Box>
          {!userDetails.linked_user && (
            <Line fontStyle="italic" color="secondary.dark">
              User not added to Middleware
            </Line>
          )}
        </Box>
      }
    >
      <FlexBox alignCenter gap1>
        <Box
          component={Link}
          href={`https://github.com/${userDetails.username}`}
          target="_blank"
          fontWeight={500}
          display="flex"
          alignItems="center"
        >
          <SimpleAvatar
            url={hasGithub ? getGHAvatar(userDetails.username) : undefined}
            name={userDetails.linked_user?.name || userDetails.username}
            size={theme.spacing(size || 2.5)}
          />
        </Box>
      </FlexBox>
    </LightTooltip>
  );
};
