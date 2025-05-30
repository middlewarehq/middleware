import {
  CheckCircleRounded,
  AccessTimeRounded,
  OpenInNew,
  Code,
  ArrowForwardIosRounded
} from '@mui/icons-material';
import { Card, Tooltip, useTheme } from '@mui/material';
import { FC, useMemo } from 'react';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { Deployment } from '@/types/resources';
import { getDurationString, isoDateString } from '@/utils/date';

type DeploymentCardType = 'Longest' | 'Shortest';

interface DeploymentCardProps {
  deployment: Deployment;
  type: DeploymentCardType;
}

interface DoraMetricsDurationProps {
  deployments: Deployment[];
}

const formatDeploymentDate = (dateString: string): string => {
  if (!dateString) return 'Unknown Date';

  try {
    const date = new Date(dateString);
    const isoDate = isoDateString(date);
    const formattedDate = new Date(isoDate);

    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    };

    return formattedDate.toLocaleDateString('en-US', options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

const DeploymentCard: FC<DeploymentCardProps> = ({ deployment }) => {
  const theme = useTheme();

  const handleDeploymentClick = () => {
    if (deployment.html_url) {
      window.open(deployment.html_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card
      elevation={0}
      sx={{
        flex: 1,
        p: 1.6,
        width: '20vw',
        maxWidth: '30vw',
        border: `1px solid ${theme.palette.primary.light}`,
        borderRadius: 2
      }}
    >
      <FlexBox col gap={1.2} sx={{ position: 'relative' }}>
        <FlexBox gap={0.8} alignItems="center">
          <FlexBox alignItems="center" gap={1}>
            <CheckCircleRounded color="success" fontSize="inherit" />
            <Line white semibold>
              Run On {formatDeploymentDate(deployment.conducted_at)}
            </Line>
          </FlexBox>
          <Tooltip title="Open in new tab" arrow>
            <FlexBox
              alignItems="center"
              gap={0.5}
              sx={{
                cursor: deployment.html_url ? 'pointer' : 'not-allowed',
                opacity: deployment.html_url ? 1 : 0.7
              }}
              onClick={handleDeploymentClick}
            >
              <OpenInNew fontSize="inherit" />
            </FlexBox>
          </Tooltip>
        </FlexBox>

        <FlexBox gap={0.8} alignItems="center" justifyContent="space-between">
          <FlexBox gap={0.8} alignItems="center" flex={1}>
            <Code fontSize="small" />
            <Line sx={{ color: theme.palette.primary.light }}>
              {deployment.pr_count || 0} new PR's
            </Line>
            <Line sx={{ color: theme.palette.primary.light }}>
              {deployment.head_branch || 'Unknown Branch'}
            </Line>
            <AccessTimeRounded fontSize="small" />
            <Line sx={{ color: theme.palette.primary.light }}>
              {getDurationString(deployment.run_duration)}
            </Line>
          </FlexBox>
          <ArrowForwardIosRounded
            sx={{
              position: 'absolute',
              right: 0,
              top: '35%',
              bottom: '35%'
            }}
            fontSize="medium"
          />
        </FlexBox>
      </FlexBox>
    </Card>
  );
};

export const DoraMetricsDuration: FC<DoraMetricsDurationProps> = ({
  deployments
}) => {
  const { longestDeployment, shortestDeployment } = useMemo(() => {
    if (!Array.isArray(deployments) || !deployments.length) {
      return { longestDeployment: null, shortestDeployment: null };
    }

    const validDeployments = deployments
      .filter((d): d is Deployment =>
        Boolean(d.conducted_at && typeof d.run_duration === 'number')
      )
      .filter((d) => d.run_duration >= 0);

    if (!validDeployments.length) {
      return { longestDeployment: null, shortestDeployment: null };
    }

    // Function to calculate Longest and shortest deployments
    const { longest, shortest } = validDeployments.reduce(
      (acc, current) => ({
        longest:
          !acc.longest || current.run_duration > acc.longest.run_duration
            ? current
            : acc.longest,
        shortest:
          !acc.shortest || current.run_duration < acc.shortest.run_duration
            ? current
            : acc.shortest
      }),
      {
        longest: null as Deployment | null,
        shortest: null as Deployment | null
      }
    );

    return { longestDeployment: longest, shortestDeployment: shortest };
  }, [deployments]);

  return (
    <FlexBox col gap={1.5}>
      <FlexBox gap={3}>
        <FlexBox col gap={1}>
          <Line white sx={{ fontSize: '1.0rem' }} semibold>
            Longest Deployment
          </Line>
          <DeploymentCard deployment={longestDeployment} type="Longest" />
        </FlexBox>

        <FlexBox col gap={1}>
          <Line white sx={{ fontSize: '1.0rem' }} semibold>
            Shortest Deployment
          </Line>
          <DeploymentCard deployment={shortestDeployment} type="Shortest" />
        </FlexBox>
      </FlexBox>
    </FlexBox>
  );
};
