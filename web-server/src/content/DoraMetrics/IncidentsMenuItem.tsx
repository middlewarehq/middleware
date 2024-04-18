import {
  ArrowForwardRounded,
  CheckCircleOutlineRounded,
  HowToRegRounded,
  WarningAmberRounded
} from '@mui/icons-material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { Box, Card, useTheme } from '@mui/material';
import { format } from 'date-fns';
import { FC, useMemo } from 'react';
import ClampLines from 'react-clamp-lines';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import {
  IncidentStatus,
  IncidentsWithDeploymentResponseType
} from '@/types/resources';
import { getDurationString } from '@/utils/date';

export const IncidentsMenuItem: FC<{
  incident: IncidentsWithDeploymentResponseType;
  selectedIncidentId: ID;
  clickHandler: (incident: IncidentsWithDeploymentResponseType) => void;
  showIcon?: boolean;
}> = ({ incident, selectedIncidentId, clickHandler, showIcon = true }) => {
  const theme = useTheme();
  const isSelected = incident.id === selectedIncidentId;

  const updatedDate =
    incident.resolved_date ||
    incident.acknowledged_date ||
    incident.creation_date;

  const resolutionTime = useMemo(
    () =>
      incident.creation_date && incident.resolved_date
        ? getDurationString(
            (new Date(incident.resolved_date).getTime() -
              new Date(incident.creation_date).getTime()) /
              1e3
          )
        : null,
    [incident.creation_date, incident.resolved_date]
  );

  return (
    <FlexBox
      key={incident.id}
      component={Card}
      p={1}
      width="250px"
      pointer
      alignCenter
      gap1
      sx={{
        bgcolor: isSelected ? theme.colors.info.lighter : undefined,
        transition: 'background-color 0.2s',
        boxShadow: isSelected
          ? `0 0 0 3px ${theme.colors.info.main}`
          : undefined,
        ':hover': { bgcolor: theme.colors.info.lighter }
      }}
      onClick={() => clickHandler(incident)}
    >
      <FlexBox fill justifyBetween gap={1 / 2} col>
        <FlexBox justifyBetween alignCenter>
          <Line tiny color="secondary">
            <FlexBox
              gap={1 / 2}
              alignCenter
              title={new Date(updatedDate)?.toLocaleString()}
              darkTip
              pointer
            >
              <CalendarMonthIcon fontSize="inherit" />
              {format(new Date(updatedDate), 'do MMMM')}
            </FlexBox>
          </Line>
          <ArrowForwardRounded fontSize="small" />
        </FlexBox>
        <Line tiny sx={{ wordBreak: 'break-all' }}>
          <ClampLines
            text={incident.title || ''}
            lines={2}
            id={incident.id}
            buttons={false}
          />
        </Line>
        <FlexBox justifyBetween alignCenter>
          {showIcon && (
            <FlexBox
              gap={1 / 2}
              alignCenter
              sx={{ textTransform: 'capitalize' }}
              fontSize="smaller"
              arrow
              bgcolor={theme.colors.secondary.lighter}
              round
              fit
              pr={1 / 2}
              pl={3 / 4}
              border={`1px solid ${theme.colors.success.light}`}
              darkTip
              pointer
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
              {incident.status}
              <IncidentItemIcon status={incident.status} />
            </FlexBox>
          )}
          {resolutionTime && (
            <FlexBox
              title={
                <FlexBox>
                  <Line>
                    Created:{' '}
                    {format(
                      new Date(incident.creation_date),
                      "do MMM, yyyy 'at' hh:mm:ss a"
                    )}
                    <br />
                    Resolved:{' '}
                    {format(
                      new Date(incident.resolved_date),
                      "do MMM, yyyy 'at' hh:mm:ss a"
                    )}
                  </Line>
                </FlexBox>
              }
            >
              <Line tiny>Resolved in {resolutionTime}</Line>
            </FlexBox>
          )}
        </FlexBox>
      </FlexBox>
    </FlexBox>
  );
};

export const IncidentItemIcon = ({ status }: { status: string }) => {
  if (status === IncidentStatus.TRIGGERED)
    return <WarningAmberRounded color="warning" fontSize="inherit" />;
  if (status === IncidentStatus.ACKNOWLEDGED)
    return <HowToRegRounded color="primary" fontSize="inherit" />;
  return <CheckCircleOutlineRounded color="success" fontSize="inherit" />;
};
