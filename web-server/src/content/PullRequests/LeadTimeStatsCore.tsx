import { InfoOutlined, ArrowForwardRounded } from '@mui/icons-material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import {
  Box,
  BoxProps,
  darken,
  SxProps,
  Button,
  List,
  ListItem,
  useTheme
} from '@mui/material';
import { secondsInDay } from 'date-fns/constants';
import Link from 'next/link';
import pluralize from 'pluralize';
import { FC, useCallback } from 'react';

import { FlexBox } from '@/components/FlexBox';
import { useOverlayPage } from '@/components/OverlayPageContext';
import { DarkTooltip } from '@/components/Shared';
import { Line } from '@/components/Text';
import { track } from '@/constants/events';
import { ROUTES } from '@/constants/routes';
import { isRoleLessThanEM } from '@/constants/useRoute';
import { usePrChangeTimePipeline } from '@/content/PullRequests/useChangeTimePipeline';
import { useAuth } from '@/hooks/useAuth';
import { useSelector } from '@/store';
import { ChangeTimeSegment } from '@/types/resources';
import { getDurationString } from '@/utils/date';

const commonSegmentProps: BoxProps = {
  ml: -1,
  py: 1 / 2,
  px: 3,
  flexShrink: 0
};

export const LeadTimeStatsCore: FC<
  {
    cycle?: number;
    changeTimeSegments: ChangeTimeSegment[];
    showTotal?: boolean;
  } & BoxProps
> = ({ cycle = 0, changeTimeSegments, showTotal, ...props }) => {
  const theme = useTheme();
  const { role } = useAuth();
  const isEng = isRoleLessThanEM(role);
  const { addPage } = useOverlayPage();
  const [initiation, response, rework, merge, deployment] = changeTimeSegments;

  const allAssignedRepos = useSelector(
    (s) => s.doraMetrics.allReposAssignedToTeam
  );
  const allReposDeploymentsAreConfigured = allAssignedRepos;

  const { reposWithNoDeploymentsConfigured, reposCountWithWorkflowConfigured } =
    usePrChangeTimePipeline();

  const calcCycleTime =
    cycle || response.duration + rework.duration + merge.duration;
  const calcLeadTime =
    calcCycleTime + initiation.duration + deployment.duration;
  const calcTimeToDisplay = calcLeadTime;
  const timeDisplayed =
    getDurationString(calcTimeToDisplay, { segments: 2 }) || 'Unavailable';

  const defaultFlex = 1;

  const triggerPrPageOverlay = useCallback(() => {
    addPage({
      page: {
        title: 'Process overview -> Pull request insights',
        ui: 'team_prs'
      }
    });
  }, [addPage]);

  const triggerDeploymentFreqPageOverlay = useCallback(() => {
    addPage({
      page: {
        title: 'Process overview -> Deployments insights',
        ui: 'deployment_freq'
      }
    });
  }, [addPage]);

  return (
    <FlexBox col gap1>
      <Box
        display="flex"
        borderRadius={1}
        overflow="hidden"
        maxHeight="100px"
        flex={1}
        {...props}
        onMouseEnter={() => track('HOVER_ON_CHANGE_TIME_QUICK_STATS_CHART')}
      >
        <Box
          bgcolor={initiation.bgColor}
          color={initiation.color}
          {...commonSegmentProps}
          ml={0}
          flex={initiation.duration || defaultFlex}
          sx={{
            ...ChangeTypeStatBoxStyles,
            clipPath: initiation.clipPath
          }}
          onClick={triggerPrPageOverlay}
        >
          <Box>{initiation.title}</Box>
          <FlexBox fontWeight="bold" fontSize="1.1em" alignCenter gap={1 / 2}>
            {getDurationString(initiation.duration, {
              segments: 1
            }) || '-'}{' '}
            <DarkTooltip arrow title={initiation.description}>
              <InfoOutlined fontSize="inherit" />
            </DarkTooltip>
          </FlexBox>
        </Box>

        <Box
          {...commonSegmentProps}
          bgcolor={response.bgColor}
          color={response.color}
          flex={response.duration || defaultFlex}
          sx={{
            ...ChangeTypeStatBoxStyles,
            clipPath: response.clipPath
          }}
          onClick={triggerPrPageOverlay}
        >
          <Box>{response.title}</Box>
          <FlexBox fontWeight="bold" fontSize="1.1em" alignCenter gap={1 / 2}>
            {getDurationString(response.duration) || '-'}{' '}
            <DarkTooltip arrow title={response.description}>
              <InfoOutlined fontSize="inherit" />
            </DarkTooltip>
          </FlexBox>
        </Box>
        <Box
          {...commonSegmentProps}
          bgcolor={rework.bgColor}
          color={rework.color}
          flex={rework.duration || defaultFlex}
          sx={{
            clipPath: rework.clipPath,
            ...ChangeTypeStatBoxStyles
          }}
          onClick={triggerPrPageOverlay}
        >
          <Box>{rework.title}</Box>
          <FlexBox fontWeight="bold" fontSize="1.1em" alignCenter gap={1 / 2}>
            {getDurationString(rework.duration, {
              segments: 1
            }) || '-'}{' '}
            <DarkTooltip arrow title={rework.description}>
              <InfoOutlined fontSize="inherit" />
            </DarkTooltip>
          </FlexBox>
        </Box>
        <Box
          {...commonSegmentProps}
          bgcolor={merge.bgColor}
          color={merge.color}
          flex={merge.duration || defaultFlex}
          sx={{
            ...ChangeTypeStatBoxStyles,
            clipPath: merge.clipPath
          }}
          onClick={triggerPrPageOverlay}
        >
          <Box>{merge.title}</Box>
          <FlexBox fontWeight="bold" fontSize="1.1em" alignCenter gap={1 / 2}>
            {getDurationString(merge.duration, {
              segments: 1
            }) || '-'}{' '}
            <DarkTooltip arrow title={merge.description}>
              <InfoOutlined fontSize="inherit" />
            </DarkTooltip>
          </FlexBox>
        </Box>
        <Box
          bgcolor={deployment.bgColor}
          color={deployment.color}
          {...commonSegmentProps}
          flex={deployment.duration || defaultFlex}
          sx={{
            ...ChangeTypeStatBoxStyles,
            clipPath: deployment.clipPath,
            minWidth: allReposDeploymentsAreConfigured ? '120px' : '180px'
          }}
          onClick={triggerDeploymentFreqPageOverlay}
        >
          <FlexBox
            flex={1}
            sx={{
              display: 'flex',
              alignItems: 'flex-end'
            }}
            gap={1 / 2}
            justifyCenter
          >
            {deployment.title}
            {reposCountWithWorkflowConfigured !== allAssignedRepos.length && (
              <FlexBox
                title={
                  <FlexBox col gap={1}>
                    <Line medium bold white>
                      Lead time insight based on data from{' '}
                      {reposCountWithWorkflowConfigured} out of{' '}
                      {allAssignedRepos.length}{' '}
                      {pluralize('repo', reposCountWithWorkflowConfigured)}{' '}
                      which have workflow configured.
                    </Line>
                    <Line medium>
                      Following{' '}
                      {pluralize(
                        'repo',
                        reposWithNoDeploymentsConfigured.length
                      )}{' '}
                      don't have any workflow assigned :
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
                          endIcon={<ArrowForwardRounded fontSize="inherit" />}
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
                <WarningAmberRoundedIcon sx={{ fontSize: '1.4em' }} />
              </FlexBox>
            )}
          </FlexBox>
          <FlexBox
            fontWeight="bold"
            fontSize="1.1em"
            gap={1 / 2}
            minHeight={'50%'}
          >
            <FlexBox alignCenter height="fit-content" gap={1 / 2}>
              {getDurationString(deployment.duration, {
                segments: secondsInDay < deployment.duration ? 2 : 1
              }) || '-'}{' '}
              <DarkTooltip arrow title={deployment.description}>
                <InfoOutlined fontSize="inherit" />
              </DarkTooltip>
            </FlexBox>
          </FlexBox>
        </Box>
      </Box>
      {showTotal && (
        <FlexBox
          round
          border={`1px solid ${theme.colors.secondary.light}`}
          centered
        >
          <Line semibold small>
            Total: {timeDisplayed}
          </Line>
        </FlexBox>
      )}
    </FlexBox>
  );
};

const ChangeTypeStatBoxStyles: SxProps = {
  fontWeight: 700,
  minWidth: '100px',
  height: '80px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  whiteSpace: 'nowrap',
  flexDirection: 'column',
  cursor: 'pointer'
};
