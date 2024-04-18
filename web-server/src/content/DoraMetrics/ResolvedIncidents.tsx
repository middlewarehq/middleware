import { Box, Card, Chip, Divider, Link, Paper, useTheme } from '@mui/material';
import { format } from 'date-fns';
import { head } from 'ramda';
import { FC, useCallback, useEffect, useMemo } from 'react';
import { FaExternalLinkAlt } from 'react-icons/fa';

import { EmptyState } from '@/components/EmptyState';
import { FlexBox } from '@/components/FlexBox';
import { MiniLoader } from '@/components/MiniLoader';
import Scrollbar from '@/components/Scrollbar';
import { LightTooltip } from '@/components/Shared';
import { SimpleAvatar } from '@/components/SimpleAvatar';
import { Line } from '@/components/Text';
import { TrendsLineChart } from '@/components/TrendsLineChart';
import { FetchState } from '@/constants/ui-states';
import { useAuth } from '@/hooks/useAuth';
import { useDoraMetricsGraph } from '@/hooks/useDoraMetricsGraph';
import { useEasyState } from '@/hooks/useEasyState';
import {
  useCurrentDateRangeReactNode,
  useSingleTeamConfig
} from '@/hooks/useStateTeamConfig';
import { fetchAllResolvedIncidents } from '@/slices/dora_metrics';
import { useDispatch, useSelector } from '@/store';
import {
  IncidentStatus,
  IncidentsWithDeploymentResponseType
} from '@/types/resources';
import { OPEN_IN_NEW_TAB_PROPS } from '@/utils/url';

import { IncidentsMenuItem, IncidentItemIcon } from './IncidentsMenuItem';

import { SubHeader } from '../../components/WrapperComponents';

export const ResolvedIncidentsBody = () => {
  const dispatch = useDispatch();
  const { orgId } = useAuth();
  const { singleTeamId, dates, team } = useSingleTeamConfig();

  const dateRangeLabel = useCurrentDateRangeReactNode();
  const isLoading = useSelector(
    (s) => s.doraMetrics.requests?.resolved_incidents === FetchState.REQUEST
  );

  const incidents = useSelector((s) => s.doraMetrics.resolved_incidents || []);

  const selectedIncidentId = useEasyState<ID>(null);
  const incidentFilter = useEasyState<IncidentStatus>(null);
  const setSelectedIncidentId = useCallback(
    (selectedIncident: IncidentsWithDeploymentResponseType) => {
      selectedIncidentId.set(selectedIncident.id);
    },
    [selectedIncidentId]
  );
  const selectedIncident = useMemo(
    () =>
      incidents.find((incident) => incident.id === selectedIncidentId.value),
    [incidents, selectedIncidentId]
  );

  const filteredIncidents = useMemo(
    () =>
      incidents.filter(
        (incident) =>
          incident.status === incidentFilter.value || !incidentFilter.value
      ),
    [incidentFilter.value, incidents]
  );

  useEffect(() => {
    dispatch(
      fetchAllResolvedIncidents({
        team_id: singleTeamId,
        from_date: dates.start,
        to_date: dates.end
      })
    );
  }, [dates.end, dates.start, dispatch, orgId, singleTeamId]);

  const { trendsSeriesMap } = useDoraMetricsGraph();
  const isTrendsSeriesDataAvailable = head(
    trendsSeriesMap.meanTimeToRestoreTrends
  ).data.length;

  if (isLoading || !team) return <MiniLoader label="Fetching incidents ..." />;
  if (!incidents.length)
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
        <SubHeader big>Mean time to recovery, across weeks</SubHeader>
        <Divider sx={{ mt: 2, mb: isTrendsSeriesDataAvailable ? 4 : 2 }} />
        {isTrendsSeriesDataAvailable ? (
          <FlexBox fullWidth height={'300px'} alignCenter justifyCenter p={1}>
            <TrendsLineChart series={trendsSeriesMap.meanTimeToRestoreTrends} />
          </FlexBox>
        ) : (
          <Line>Not enough data to show trends.</Line>
        )}
      </Card>
      <FlexBox col gap1>
        <Line>
          List of all incidents resolved from {dateRangeLabel} across all data
          sources.
        </Line>
      </FlexBox>
      <Divider />
      <FlexBox gap1 flex1 fullWidth component={Paper} minHeight="75vh">
        <FlexBox col p={1}>
          <Scrollbar autoHeight autoHeightMin="100%">
            <FlexBox col gap1 p={1} flexGrow={1}>
              {filteredIncidents?.map((incident) => {
                return (
                  <IncidentsMenuItem
                    incident={incident}
                    key={incident.id}
                    clickHandler={setSelectedIncidentId}
                    selectedIncidentId={selectedIncidentId.value}
                    showIcon={false}
                  />
                );
              })}
            </FlexBox>
          </Scrollbar>
        </FlexBox>
        <Divider orientation="vertical" />
        <SelectedIncidentDetails incident={selectedIncident} />
      </FlexBox>
    </FlexBox>
  );
};

const SelectedIncidentDetails: FC<{
  incident: IncidentsWithDeploymentResponseType;
}> = ({ incident }) => {
  const theme = useTheme();
  if (!incident)
    return (
      <FlexBox col p={4} fullWidth>
        <Line big white medium textAlign="center">
          Select an incident on the left
        </Line>
        <Line white medium textAlign="center">
          to view details including in the possible deployment
        </Line>
      </FlexBox>
    );
  const isAssigned =
    incident.assigned_to.linked_user?.name || incident.assigned_to.username;
  return (
    <FlexBox
      col
      p={2}
      fullWidth
      gap1
      sx={{ overflow: 'hidden', wordBreak: 'break-word' }}
    >
      <FlexBox justifyBetween p={2} col gap1 justifyCenter>
        <FlexBox justifyBetween alignCenter>
          <Line bold medium>
            Incident details
          </Line>
          <FlexBox gap={2} alignCenter>
            <Chip
              label={
                <LightTooltip
                  arrow
                  title={
                    <Box>
                      Assigned to{' '}
                      {incident.assigned_to.linked_user?.name ||
                        incident.assigned_to.username ||
                        'No-one'}
                    </Box>
                  }
                >
                  <Box display="flex" alignItems="center" gap={1} width="100%">
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
                  <Box display="flex" alignItems="center" gap={1} width="100%">
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
    </FlexBox>
  );
};
