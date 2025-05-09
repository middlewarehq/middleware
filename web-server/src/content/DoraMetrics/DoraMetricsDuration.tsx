import { Card, Chip, Tooltip, useTheme } from '@mui/material';
import { FC, useMemo } from 'react';
import { CheckCircleRounded, AccessTimeRounded, OpenInNew, Code, ArrowForwardIosRounded } from '@mui/icons-material';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { Deployment } from '@/types/resources';
import { getDurationString, isoDateString } from '@/utils/date';

type DeploymentCardType = 'Longest' | 'Shortest';

interface DeploymentWithValidDuration extends Deployment {
  duration: number;
}

interface DeploymentCardProps {
  deployment: DeploymentWithValidDuration;
  type: DeploymentCardType;
}

interface DoraMetricsDurationProps {
  deployments: Deployment[];
}

const calculateDurationFromConductedAt = (conductedAt: string): number | undefined => {
  try {
    const deploymentDate = new Date(conductedAt);
    if (isNaN(deploymentDate.getTime())) {
      return undefined;
    }
    const now = new Date();
    return Math.floor((now.getTime() - deploymentDate.getTime()) / 1000);
  } catch (error) {
    console.error('Error calculating duration:', error);
    return undefined;
  }
};

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
        borderRadius: 2,
      }}
    >
      <FlexBox col gap={1.2} sx={{ position: 'relative' }}>
        <FlexBox gap={0.8} alignItems="center" >
          <FlexBox alignItems="center" gap={1}>
            <CheckCircleRounded color="success" fontSize="inherit" />
            <Line white semibold>Run On {formatDeploymentDate(deployment.conducted_at)}</Line>
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
            <Line sx={{ color: theme.palette.primary.light }}>{getDurationString(deployment.duration)}</Line>
          </FlexBox>
          <ArrowForwardIosRounded
            fontSize="medium"
          />
        </FlexBox>
      </FlexBox>
    </Card>
  );
};

export const DoraMetricsDuration: FC<DoraMetricsDurationProps> = ({ deployments }) => {
  const { longestDeployment, shortestDeployment } = useMemo(() => {
    if (!Array.isArray(deployments) || !deployments.length) {
      return { longestDeployment: null, shortestDeployment: null };
    }

    const validDeployments = deployments
      .filter((d): d is Deployment => Boolean(d.conducted_at))
      .map(deployment => ({
        ...deployment,
        duration: calculateDurationFromConductedAt(deployment.conducted_at)
      }))
      .filter((d): d is DeploymentWithValidDuration => 
        typeof d.duration === 'number' && 
        d.duration >= 0
      );

    if (!validDeployments.length) {
      return { longestDeployment: null, shortestDeployment: null };
    }

    // Function to calculate Longest and shortest deployments
    const { longest, shortest } = validDeployments.reduce((acc, current) => ({
      longest: !acc.longest || current.duration > acc.longest.duration ? current : acc.longest,
      shortest: !acc.shortest || current.duration < acc.shortest.duration ? current : acc.shortest
    }), {
      longest: null as DeploymentWithValidDuration | null,
      shortest: null as DeploymentWithValidDuration | null
    });

    return { longestDeployment: longest, shortestDeployment: shortest };
  }, [deployments]);

  return (
    <FlexBox col gap={1.5}>
      <FlexBox gap={3}>
        <FlexBox col gap={1}>
          <Line white sx={{ fontSize: '1.1rem' }} bold>Longest Deployment</Line>
          <DeploymentCard
            deployment={longestDeployment}
            type="Longest"
          />
        </FlexBox>

        <FlexBox col gap={1}>
          <Line white sx={{ fontSize: '1.1rem' }} bold>Shortest Deployment</Line>
          <DeploymentCard
            deployment={shortestDeployment}
            type="Shortest"
          />
        </FlexBox>
      </FlexBox>
    </FlexBox>
  );
};
