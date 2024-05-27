import { ArrowForwardRounded } from '@mui/icons-material';
import {
  alpha,
  Avatar,
  Box,
  BoxProps,
  lighten,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  useTheme
} from '@mui/material';
import { format } from 'date-fns';
import pluralize from 'pluralize';
import { FC } from 'react';
import { GoCommentDiscussion } from 'react-icons/go';
import { IoGitCommit } from 'react-icons/io5';
import { VscRequestChanges } from 'react-icons/vsc';

import { FlexBox } from '@/components/FlexBox';
import { LightTooltip } from '@/components/Shared';
import { Line } from '@/components/Text';
import { useAuth } from '@/hooks/useAuth';
import { brandColors } from '@/theme/schemes/theme';
import { PR } from '@/types/resources';
import { getDurationString } from '@/utils/date';
import { staticArray } from '@/utils/mock';
import { stringAvatar } from '@/utils/stringAvatar';
import { getColorByStatus, getGHAvatar } from '@/utils/user';

import {
  CELL_PAD,
  PullRequestsTableHeadMini,
  PullRequestsTableHeadProps
} from './PullRequestsTableHeadMini';

import { SimpleAvatar } from '../SimpleAvatar';

export const PullRequestsTableMini: FC<
  { prs: PR[] } & PullRequestsTableHeadProps
> = ({ prs, conf, updateSortConf, hideColumns }) => {
  const theme = useTheme();
  const { integrations } = useAuth();

  const hasBitbucket = integrations?.bitbucket;
  const hasGithub = integrations?.github;

  return (
    <FlexBox fullWidth>
      <TableContainer
        sx={{
          border: `2px solid ${theme.colors.secondary.light}`,
          borderRadius: 1,
          width: '100%'
        }}
      >
        <Table stickyHeader sx={{ width: '100%' }}>
          <PullRequestsTableHeadMini
            conf={conf}
            updateSortConf={updateSortConf}
            hideColumns={hideColumns}
          />
          <TableBody>
            {prs.map((pr) => {
              const linesChanged = pr.additions + pr.deletions;
              const linedAddedChunks = Math.floor(
                ((pr.additions / linesChanged) * 10) / 2
              );
              const linedDeletedChunks = Math.floor(
                ((pr.deletions / linesChanged) * 10) / 2
              );
              const changesBoxColors: string[] = []
                .concat(
                  ...staticArray<string>(linedAddedChunks).fill(
                    lighten(theme.colors.success.main, 0.4)
                  )
                )
                .concat(
                  ...staticArray<string>(linedDeletedChunks).fill(
                    lighten(theme.colors.error.main, 0.4)
                  )
                )
                .concat(
                  ...staticArray<string>(
                    5 - linedAddedChunks - linedDeletedChunks
                  ).fill(lighten(theme.colors.secondary.main, 0.4))
                );

              return (
                <TableRow key={pr.pr_link}>
                  <TableCell sx={{ p: CELL_PAD }}>
                    <FlexBox
                      link={pr.pr_link}
                      col
                      openInNewTab
                      noShrink
                      pointer
                      title="View PR"
                      tooltipPlacement="left"
                    >
                      <Line tiny clip maxWidth="250px">
                        #{pr.number} - {pr.repo_name} {pr.head_branch}
                      </Line>
                      <Line small>
                        {pr.title ? (
                          <Line white underline>
                            {pr.title}
                          </Line>
                        ) : (
                          <Line color="secondary.dark" italic>
                            PR title couldn't be fetched
                          </Line>
                        )}
                      </Line>
                      <FlexBox alignCenter gap1>
                        <Line tiny>
                          {format(new Date(pr.created_at), 'do, MMM')}
                        </Line>
                        <Line
                          tiny
                          fontWeight={700}
                          color={getColorByStatus(pr.state)}
                        >
                          {pr.state} {'->'} {pr.base_branch}
                        </Line>
                      </FlexBox>

                      <FlexBox alignCenter gap={1 / 2} whiteSpace="nowrap">
                        <Box
                          display="flex"
                          alignItems="center"
                          gap={1 / 2}
                          fontWeight={600}
                        >
                          <Line
                            tiny
                            color={lighten(theme.colors.success.main, 0.4)}
                          >
                            +{pr.additions}
                          </Line>
                          <Line
                            tiny
                            color={lighten(theme.colors.error.main, 0.4)}
                          >
                            -{pr.deletions}
                          </Line>
                          <Box display="flex" gap={1 / 4}>
                            {changesBoxColors.map((color, i) => (
                              <Box
                                key={i}
                                height={theme.spacing(2 / 3)}
                                width={theme.spacing(2 / 3)}
                                borderRadius={1}
                                bgcolor={color}
                              />
                            ))}
                          </Box>
                        </Box>
                      </FlexBox>
                    </FlexBox>
                  </TableCell>
                  {!hideColumns?.has('commits') && (
                    <TableCell sx={{ p: CELL_PAD }}>
                      <FlexBox fullWidth alignCenter>
                        <FlexBox
                          col
                          gap={1 / 2}
                          title={
                            <Box
                              display="grid"
                              gridTemplateColumns="auto 1fr"
                              columnGap={2}
                              fontSize="1.2em"
                            >
                              <Box
                                gridArea="1 / 1 / 2 / 3"
                                fontWeight={700}
                                mb={1}
                              >
                                Git changes
                              </Box>
                              <Box>Commits</Box>
                              <Box textAlign="right">{pr.commits}</Box>
                              <Box>Lines</Box>
                              <Box textAlign="right">
                                {pr.additions + pr.deletions}
                              </Box>
                              <Box>Comments</Box>
                              <Box textAlign="right">{pr.comments}</Box>
                              <Box>Files</Box>
                              <Box textAlign="right">{pr.changed_files}</Box>
                            </Box>
                          }
                        >
                          <FlexBox
                            flex1
                            gap1
                            alignCenter
                            color={alpha(theme.colors.secondary.main, 0.8)}
                          >
                            <IoGitCommit />
                            <Line fontWeight={600}>{pr.commits}</Line>
                          </FlexBox>
                          <FlexBox
                            flex1
                            gap1
                            alignCenter
                            color={
                              pr.additions + pr.deletions
                                ? 'warning.main'
                                : 'secondary.light'
                            }
                          >
                            <VscRequestChanges />
                            <Line fontWeight={600}>
                              {pr.additions + pr.deletions}
                            </Line>
                          </FlexBox>
                          <FlexBox
                            flex1
                            gap1
                            alignCenter
                            color={
                              pr.comments ? 'info.main' : 'secondary.light'
                            }
                          >
                            <GoCommentDiscussion />
                            <Box fontWeight={600}>{pr.comments}</Box>
                          </FlexBox>
                        </FlexBox>
                      </FlexBox>
                    </TableCell>
                  )}

                  {!hideColumns?.has('rework_cycles') && (
                    <TableCell sx={{ p: CELL_PAD }}>
                      {pr.rework_cycles ? (
                        <>
                          <Line big bold white>
                            {pr.rework_cycles}
                          </Line>{' '}
                          <Line tiny>
                            {pluralize('time', pr.rework_cycles)}
                          </Line>
                        </>
                      ) : (
                        <Line>--</Line>
                      )}
                    </TableCell>
                  )}
                  {!hideColumns?.has('author') && (
                    <TableCell sx={{ p: CELL_PAD }}>
                      <LightTooltip
                        arrow
                        title={
                          <Box>
                            <Box>
                              {hasBitbucket
                                ? pr.author.linked_user?.name ||
                                  pr.author.username
                                : `@${pr.author.username}`}
                            </Box>
                          </Box>
                        }
                      >
                        <Box
                          display="flex"
                          alignItems="center"
                          gap={1}
                          width="100%"
                        >
                          <Box
                            component={hasBitbucket ? 'div' : Link}
                            href={
                              hasBitbucket
                                ? undefined
                                : `https://github.com/${pr.author.username}`
                            }
                            target="_blank"
                            fontWeight={500}
                            display="flex"
                            alignItems="center"
                          >
                            <SimpleAvatar
                              url={
                                hasGithub
                                  ? getGHAvatar(pr.author.username)
                                  : undefined
                              }
                              name={
                                pr.author?.linked_user?.name ||
                                pr.author?.username
                              }
                              size={theme.spacing(4)}
                            />
                          </Box>
                        </Box>
                      </LightTooltip>
                    </TableCell>
                  )}
                  {!hideColumns?.has('reviewers') && (
                    <TableCell sx={{ p: CELL_PAD }}>
                      <FlexBox
                        alignCenter
                        margin="auto"
                        gap={1}
                        width="100%"
                        flexWrap="wrap"
                        maxWidth="60px"
                      >
                        {pr.reviewers.map((reviewer) => (
                          <FlexBox
                            title={
                              <Box>
                                <Box>
                                  {hasBitbucket
                                    ? reviewer.linked_user?.name ||
                                      reviewer.username
                                    : `@${reviewer.username}`}
                                </Box>
                              </Box>
                            }
                            key={reviewer.username}
                            component={hasBitbucket ? 'div' : Link}
                            href={
                              hasBitbucket
                                ? undefined
                                : `https://github.com/${reviewer.username}`
                            }
                            target="_blank"
                            fontWeight={500}
                            display="flex"
                            alignItems="center"
                          >
                            <Avatar
                              {...stringAvatar(
                                (
                                  reviewer.linked_user?.name ||
                                  reviewer.username
                                ).toUpperCase(),
                                {
                                  size: '1.7em',
                                  boxShadow: `0 0 0 2px ${theme.colors.info.main}`
                                }
                              )}
                              src={
                                hasBitbucket
                                  ? undefined
                                  : getGHAvatar(reviewer.username)
                              }
                            />
                          </FlexBox>
                        ))}
                      </FlexBox>
                    </TableCell>
                  )}
                  {!hideColumns?.has('cycle_time') && (
                    <TableCell sx={{ p: CELL_PAD }}>
                      <MiniCycleTimeStat
                        cycle={pr.cycle_time}
                        response={pr.first_response_time}
                        rework={pr.rework_time}
                        release={pr.merge_time}
                      />
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </FlexBox>
  );
};

export const MiniCycleTimeCore: FC<
  {
    cycle?: number;
    response?: number;
    rework?: number;
    release?: number;
  } & BoxProps
> = ({ cycle = 0, release = 0, response = 0, rework = 0, ...props }) => {
  const theme = useTheme();

  const calcCycleTime = cycle || response + rework + release;

  const defaultFlex = !calcCycleTime ? 1 : 0;

  return (
    <Box
      display="flex"
      borderRadius={1 / 2}
      overflow="hidden"
      width="100%"
      flex={1}
      maxWidth="400px"
      {...props}
    >
      <Box
        bgcolor={brandColors.pr.firstResponseTime}
        color={theme.palette.background.default}
        fontWeight={700}
        py={1 / 2}
        pl={2}
        pr={3}
        minWidth={0}
        height="30px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        whiteSpace="nowrap"
        flex={response || defaultFlex}
        sx={{
          clipPath: `polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%)`
        }}
      >
        {getDurationString(response || 0) || '-'}
      </Box>
      <Box
        bgcolor={brandColors.pr.reworkTime}
        color={theme.palette.background.default}
        fontWeight={700}
        mx={-1 / 2}
        py={1 / 2}
        px={3}
        minWidth={0}
        height="30px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        whiteSpace="nowrap"
        flex={rework || defaultFlex}
        sx={{
          clipPath: `polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%, 10px 50%)`
        }}
      >
        {getDurationString(rework || 0) || '-'}
      </Box>
      <Box
        bgcolor={brandColors.pr.mergeTime}
        color={theme.palette.background.default}
        fontWeight={700}
        py={1 / 2}
        pl={3}
        pr={2}
        minWidth={0}
        height="30px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        whiteSpace="nowrap"
        flex={release || defaultFlex}
        sx={{
          clipPath: `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 10px 50%)`
        }}
      >
        {getDurationString(release || 0) || '-'}
      </Box>
    </Box>
  );
};

export const CycleTimePill: FC<{ time: number }> = ({ time }) => {
  const theme = useTheme();
  return (
    <Box
      fontWeight={700}
      py={1 / 2}
      px={1}
      borderRadius={1 / 2}
      boxShadow={`0 0 0 2px inset ${alpha(theme.colors.secondary.main, 0.6)}`}
      width="60px"
      height="30px"
      fontSize="small"
      textAlign="center"
      display="flex"
      alignItems="center"
      justifyContent="center"
      whiteSpace="nowrap"
    >
      {getDurationString(time) || '-'}
    </Box>
  );
};

export const MiniCycleTimeLabels = () => {
  const theme = useTheme();

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      gap={1 / 2}
      px={1 / 2}
      borderRadius={1 / 2}
      fontWeight={700}
      border={`1px solid ${alpha(theme.colors.secondary.main, 0.6)}`}
    >
      <Box color={brandColors.pr.firstResponseTime}>Response</Box>
      <Box color="white" fontSize="1.2em" display="flex" alignItems="center">
        <ArrowForwardRounded fontSize="inherit" color="secondary" />
      </Box>
      <Box color={brandColors.pr.reworkTime}>Rework</Box>
      <Box color="white" fontSize="1.2em" display="flex" alignItems="center">
        <ArrowForwardRounded fontSize="inherit" color="secondary" />
      </Box>
      <Box color={brandColors.pr.mergeTime}>Merge</Box>
    </Box>
  );
};

export const MiniCycleTimeStat: FC<{
  cycle?: number;
  response?: number;
  rework?: number;
  release?: number;
}> = ({ cycle = 0, release = 0, response = 0, rework = 0 }) => {
  const calcCycleTime = response + rework + release;

  return (
    <FlexBox
      alignCenter
      gap1
      darkTip
      title={
        <>
          <MiniCycleTimeCore
            cycle={cycle}
            release={release}
            response={response}
            rework={rework}
            mb={1}
          />
          <MiniCycleTimeLabels />
        </>
      }
      tooltipPlacement="left"
    >
      <CycleTimePill time={calcCycleTime || cycle} />
    </FlexBox>
  );
};
