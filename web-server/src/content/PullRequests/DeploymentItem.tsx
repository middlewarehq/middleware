import {
  AccessTimeRounded,
  ArrowForwardRounded,
  CheckCircleRounded,
  CloseRounded,
  CodeRounded
} from '@mui/icons-material';
import { Card, useTheme } from '@mui/material';
import { format } from 'date-fns';
import Link from 'next/link';
import { FC } from 'react';
import { FaExternalLinkAlt } from 'react-icons/fa';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { Deployment } from '@/types/resources';
import { getDurationString } from '@/utils/date';
import { OPEN_IN_NEW_TAB_PROPS } from '@/utils/url';

export const DeploymentItem: FC<{
  dep: Deployment;
  selected?: boolean;
  onSelect?: (dep: Deployment) => any;
}> = ({ dep, selected, onSelect }) => {
  const theme = useTheme();
  const isWorkflowDeployment = dep.id.startsWith('WORKFLOW');

  return (
    <FlexBox
      key={dep.id}
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
      onClick={() => onSelect?.(dep)}
    >
      <FlexBox fill alignCenter justifyBetween gap1>
        <FlexBox col flex1>
          <FlexBox alignCenter gap={1 / 2}>
            {dep.status === 'SUCCESS' ? (
              <CheckCircleRounded color="success" fontSize="inherit" />
            ) : (
              <CloseRounded color="error" fontSize="inherit" />
            )}
            <Line tiny bold>
              Run on {format(new Date(dep.conducted_at), 'do, MMM - hh:mmaaa')}
            </Line>
            {dep.html_url && (
              <Link passHref href={dep.html_url} {...OPEN_IN_NEW_TAB_PROPS}>
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
              title={
                dep.pr_count >= 0
                  ? `This deployment included ${dep.pr_count || 'no'} new ${
                      dep.pr_count === 1 ? 'PR' : 'PRs'
                    }`
                  : 'This deployment may contain PRs merged outside the selected date range'
              }
              tooltipPlacement="left"
            >
              {isWorkflowDeployment && (
                <>
                  <CodeRounded fontSize="inherit" />
                  <Line
                    tiny
                    sx={{ whiteSpace: 'nowrap', transform: 'translateY(1px)' }}
                  >
                    {dep.pr_count >= 0 ? dep.pr_count || 'No' : '--'}
                    {' new '}
                    {dep.pr_count >= 0 && (dep.pr_count === 1 ? 'PR' : 'PRs')}
                  </Line>
                </>
              )}
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
                {dep.head_branch}
              </Line>
            </FlexBox>
            {isWorkflowDeployment && (
              <FlexBox
                alignCenter
                gap={1 / 4}
                title={`This deployment took ${getDurationString(
                  dep.run_duration
                )} to run`}
                tooltipPlacement="right"
              >
                <AccessTimeRounded fontSize="inherit" />
                <Line small sx={{ whiteSpace: 'nowrap' }}>
                  {getDurationString(dep.run_duration)}
                </Line>
              </FlexBox>
            )}
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
