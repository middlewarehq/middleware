import { AccessTimeRounded, ArrowForwardRounded } from '@mui/icons-material';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import NearbyErrorIcon from '@mui/icons-material/NearbyError';
import { Card, useTheme } from '@mui/material';
import { format } from 'date-fns';
import Link from 'next/link';
import pluralize from 'pluralize';
import { FC } from 'react';
import { FaExternalLinkAlt } from 'react-icons/fa';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { DeploymentWithIncidents } from '@/types/resources';
import { getDurationString } from '@/utils/date';
import { OPEN_IN_NEW_TAB_PROPS } from '@/utils/url';

export const DeploymentWithIncidentsMenuItem: FC<{
  deployment: DeploymentWithIncidents;
  selected: boolean;
  onSelect: (dep: DeploymentWithIncidents) => any;
}> = ({ deployment, selected, onSelect }) => {
  const theme = useTheme();
  const incidents = deployment.incidents;

  return (
    <FlexBox
      key={deployment.id}
      component={Card}
      p={1}
      width="280px"
      pointer
      sx={{
        bgcolor: !onSelect && selected ? theme.colors.info.lighter : undefined,
        transition: 'background-color 0.2s',
        boxShadow: selected ? `0 0 0 3px ${theme.colors.info.main}` : undefined,
        ':hover': { bgcolor: theme.colors.info.lighter }
      }}
      onClick={() => onSelect(deployment)}
    >
      <FlexBox fill alignCenter justifyBetween gap1>
        <FlexBox col flex1>
          <FlexBox alignCenter gap={1 / 2}>
            <NearbyErrorIcon color="error" fontSize="inherit" />
            <Line tiny bold>
              Run on{' '}
              {format(new Date(deployment.conducted_at), 'do, MMM - hh:mmaaa')}
            </Line>
            {deployment.html_url && (
              <Link
                passHref
                href={deployment.html_url}
                {...OPEN_IN_NEW_TAB_PROPS}
              >
                <Line
                  tiny
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
          <FlexBox alignCenter justifyBetween fullWidth>
            <FlexBox
              alignCenter
              gap={1 / 4}
              title={`This deployment may have led to ${
                incidents.length
              } ${pluralize('incident', incidents.length)}`}
              tooltipPlacement="left"
            >
              <BugReportOutlinedIcon fontSize="inherit" />
              <Line
                tiny
                sx={{ whiteSpace: 'nowrap', transform: 'translateY(1px)' }}
              >
                {incidents.length} {pluralize('incident', incidents.length)}
              </Line>
              <Line
                small
                mono
                px={1 / 2}
                color="info"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100px'
                }}
              >
                {deployment.head_branch}
              </Line>
            </FlexBox>
            <FlexBox
              alignCenter
              gap={1 / 4}
              title={`This deployment took ${getDurationString(
                deployment.run_duration
              )} to run`}
              tooltipPlacement="right"
            >
              <AccessTimeRounded fontSize="inherit" />
              <Line small sx={{ whiteSpace: 'nowrap' }}>
                {getDurationString(deployment.run_duration)}
              </Line>
            </FlexBox>
          </FlexBox>
        </FlexBox>
        {onSelect && (
          <ArrowForwardRounded
            fontSize="small"
            color={selected ? 'info' : undefined}
          />
        )}
      </FlexBox>
    </FlexBox>
  );
};
