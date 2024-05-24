import {
  ArrowForwardRounded,
  VerticalAlignBottomRounded
} from '@mui/icons-material';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import {
  Avatar,
  Box,
  BoxProps,
  Button,
  Checkbox,
  Divider,
  Link,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  alpha,
  lighten,
  useTheme
} from '@mui/material';
import { format } from 'date-fns';
import { secondsInDay } from 'date-fns/constants';
import pluralize from 'pluralize';
import { filter, keys } from 'ramda';
import { FC, ReactNode, useEffect, useMemo } from 'react';
import { GoCommentDiscussion } from 'react-icons/go';
import { IoGitCommit } from 'react-icons/io5';
import { VscRequestChanges } from 'react-icons/vsc';

import { FlexBox } from '@/components/FlexBox';
import { PullRequestTableColumnSelector } from '@/components/PRTable/PullRequestTableColumnSelector';
import { DarkTooltip, LightTooltip } from '@/components/Shared';
import { Line } from '@/components/Text';
import { SearchInput } from '@/components/TicketsTableAddons/SearchInput';
import { EasyState, useEasyState } from '@/hooks/useEasyState';
import { useTableSort } from '@/hooks/useTableSort';
import { DEFAULT_PR_TABLE_COLUMN_STATE_MAP, appSlice } from '@/slices/app';
import { useDispatch, useSelector } from '@/store';
import { brandColors } from '@/theme/schemes/theme';
import { PR } from '@/types/resources';
import { getDurationString } from '@/utils/date';
import { staticArray } from '@/utils/mock';
import { stringAvatar } from '@/utils/stringAvatar';
import { getColorByStatus, getGHAvatar } from '@/utils/user';

import {
  CELL_PAD,
  PullRequestsTableHead,
  PullRequestsTableHeadProps
} from './PullRequestsTableHead';

const PAGE_SIZE = 10;

export const PullRequestsTable: FC<
  {
    propPrs: PR[];
    selectionMenu?: ReactNode;
    selectedPrIds: EasyState<ID[]>;
  } & Omit<PullRequestsTableHeadProps, 'conf' | 'updateSortConf' | 'count'>
> = ({ propPrs, selectionMenu, selectedPrIds, isPrSelectionEnabled }) => {
  const theme = useTheme();
  const prTableColumnConfig = useSelector(
    (s) => s.app.prTableColumnsConfig || DEFAULT_PR_TABLE_COLUMN_STATE_MAP
  );
  const searchInput = useEasyState<string>('');

  const enabledColumnsSet = useMemo(() => {
    const activeColumns = keys(filter(Boolean, prTableColumnConfig));
    return new Set(activeColumns);
  }, [prTableColumnConfig]);

  const {
    sortedList: sortedPrs,
    updateSortConf,
    conf,
    getCSV
  } = useTableSort(propPrs, { field: 'lead_time', order: 'desc' });

  const filteredPrs = useMemo(() => {
    let prs = sortedPrs;

    if (searchInput.value.trim()) {
      prs = prs.filter((pr) =>
        Object.values(pr).some(
          (value) =>
            typeof value === 'string' &&
            value.toLowerCase().includes(searchInput.value.toLowerCase())
        )
      );
    }
    return prs;
  }, [sortedPrs, searchInput.value]);

  const page = useEasyState(1);
  const pagedPrs = useMemo(
    () =>
      filteredPrs.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE),
    [page.value, filteredPrs]
  );
  const pageCount = Math.ceil(filteredPrs.length / PAGE_SIZE);

  useEffect(() => {
    if (pageCount < page.value) {
      page.set(Math.max(pageCount, 1));
    }
  }, [page, pageCount]);

  const enableCsv = true;

  useLeadTimeMigration();

  return (
    <FlexBox col gap1>
      {pageCount > 1 && (
        <Pagination
          page={page.value}
          count={pageCount}
          onChange={(_, p) => page.set(p)}
        />
      )}
      <FlexBox justifyBetween>
        <FlexBox gap={2} alignCenter>
          <SearchInput
            inputHandler={searchInput.set}
            inputText={searchInput.value}
          />
        </FlexBox>

        <FlexBox gap1>
          {selectionMenu}
          {!!propPrs.length && enableCsv && (
            <Button
              sx={{
                maxWidth: 'fit-content',
                border: `1px solid ${theme.colors.secondary.light}`
              }}
              onClick={getCSV}
            >
              <Line primary>
                <FlexBox gap1 alignCenter>
                  <VerticalAlignBottomRounded fontSize="inherit" />
                  Download CSV
                </FlexBox>
              </Line>
            </Button>
          )}
          <PullRequestTableColumnSelector />
        </FlexBox>
      </FlexBox>

      <TableContainer
        sx={{
          border: `2px solid ${theme.colors.secondary.light}`,
          borderRadius: 1
        }}
      >
        <Table stickyHeader sx={{ overflow: 'auto !important' }}>
          <PullRequestsTableHead
            count={propPrs.length}
            prs={pagedPrs}
            selectedPrIds={selectedPrIds}
            conf={conf}
            updateSortConf={updateSortConf}
            enabledColumnsSet={enabledColumnsSet}
            isPrSelectionEnabled={isPrSelectionEnabled}
          />
          <TableBody>
            {pagedPrs.map((pr) => {
              return (
                <TableRow key={pr.pr_link}>
                  {isPrSelectionEnabled && (
                    <TableCell>
                      <DarkTooltip title="Select to exclude this from all PR analysis via the button above the table">
                        <Checkbox
                          checked={Boolean(
                            selectedPrIds.value.find(
                              (selectedPr) => selectedPr === pr.id
                            )
                          )}
                          onChange={(e) => {
                            if (e.target.checked) {
                              selectedPrIds.set([
                                ...selectedPrIds.value,
                                pr.id
                              ]);
                              return;
                            }
                            selectedPrIds.set(
                              selectedPrIds.value.filter(
                                (selectedPr) => selectedPr !== pr.id
                              )
                            );
                          }}
                        />
                      </DarkTooltip>
                    </TableCell>
                  )}
                  <TableCell sx={{ p: CELL_PAD }}>
                    <PrMetaCell pr={pr} />
                  </TableCell>
                  <TableCell sx={{ p: CELL_PAD }}>
                    <Box width="100%" display="flex" alignItems="center">
                      <LightTooltip arrow title={<PrChangesTooltip pr={pr} />}>
                        <Box
                          display="flex"
                          alignItems="center"
                          bgcolor={theme.colors.secondary.lighter}
                          borderRadius={1}
                          overflow="hidden"
                          maxWidth="220px"
                          gap={2}
                          py={1 / 2}
                          px={1}
                        >
                          {enabledColumnsSet?.has('commits') && (
                            <Box
                              display="flex"
                              flex={1}
                              gap={1}
                              alignItems="center"
                              justifyContent="flex-start"
                              color={alpha(theme.colors.secondary.main, 0.8)}
                            >
                              <IoGitCommit />
                              <Box fontWeight={600}>{pr.commits}</Box>
                            </Box>
                          )}
                          {enabledColumnsSet?.has('lines_changed') && (
                            <Box
                              display="flex"
                              flex={1}
                              gap={1}
                              alignItems="center"
                              justifyContent="center"
                              color={
                                pr.additions + pr.deletions
                                  ? 'warning.main'
                                  : 'secondary.light'
                              }
                            >
                              <VscRequestChanges />
                              <Box fontWeight={600}>
                                {pr.additions + pr.deletions}
                              </Box>
                            </Box>
                          )}
                          {enabledColumnsSet?.has('comments') && (
                            <Box
                              display="flex"
                              flex={1}
                              gap={1}
                              alignItems="center"
                              justifyContent="flex-end"
                              color={
                                pr.comments ? 'info.main' : 'secondary.light'
                              }
                            >
                              <GoCommentDiscussion />
                              <Box fontWeight={600}>{pr.comments}</Box>
                            </Box>
                          )}
                        </Box>
                      </LightTooltip>
                    </Box>
                  </TableCell>
                  {enabledColumnsSet.has('base_branch') && (
                    <TableCell sx={{ p: CELL_PAD }}>{pr.base_branch}</TableCell>
                  )}
                  {enabledColumnsSet.has('head_branch') && (
                    <TableCell sx={{ p: CELL_PAD }}>{pr.head_branch}</TableCell>
                  )}
                  {enabledColumnsSet.has('changed_files') && (
                    <TableCell sx={{ p: CELL_PAD }}>
                      <Line big bold white>
                        {pr.changed_files}
                      </Line>{' '}
                      <Line tiny>{pluralize('file', pr.changed_files)}</Line>
                    </TableCell>
                  )}
                  {enabledColumnsSet.has('rework_cycles') && (
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
                  {enabledColumnsSet.has('author') && (
                    <TableCell sx={{ p: CELL_PAD }}>
                      <LightTooltip
                        arrow
                        title={
                          <Box>
                            <Box>{`@${pr.author.username}`}</Box>
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
                            component={Link}
                            href={getGHAvatar(pr.author.username)}
                            target="_blank"
                            fontWeight={500}
                            display="flex"
                            alignItems="center"
                          >
                            <Avatar
                              {...stringAvatar(
                                (
                                  pr.author.linked_user?.name ||
                                  pr.author.username
                                ).toUpperCase(),
                                {
                                  size: '2.4em',
                                  boxShadow: `0 0 0 2px ${theme.colors.info.main}`
                                }
                              )}
                              src={getGHAvatar(pr.author.username)}
                            />
                          </Box>
                        </Box>
                      </LightTooltip>
                    </TableCell>
                  )}
                  {enabledColumnsSet.has('reviewers') && (
                    <TableCell sx={{ p: CELL_PAD }}>
                      <PrReviewersCell pr={pr} />
                    </TableCell>
                  )}
                  {enabledColumnsSet.has('first_commit_to_open') && (
                    <TableCell sx={{ p: CELL_PAD }}>
                      <Line>
                        {getDurationString(
                          Math.max(pr.first_commit_to_open, 0)
                        ) || '--'}
                      </Line>
                    </TableCell>
                  )}
                  {enabledColumnsSet.has('first_response_time') && (
                    <TableCell sx={{ p: CELL_PAD }}>
                      <Line>
                        {pr.first_response_time
                          ? getDurationString(pr.first_response_time)
                          : '--'}
                      </Line>
                    </TableCell>
                  )}
                  {enabledColumnsSet.has('rework_time') && (
                    <TableCell sx={{ p: CELL_PAD }}>
                      <Line>
                        {pr.rework_time
                          ? getDurationString(pr.rework_time)
                          : '--'}
                      </Line>
                    </TableCell>
                  )}
                  {enabledColumnsSet.has('merge_time') && (
                    <TableCell sx={{ p: CELL_PAD }}>
                      <Line>
                        {pr.merge_time
                          ? getDurationString(pr.merge_time)
                          : '--'}
                      </Line>
                    </TableCell>
                  )}
                  {enabledColumnsSet.has('merge_to_deploy') && (
                    <TableCell sx={{ p: CELL_PAD }}>
                      <Line>
                        {getDurationString(pr.merge_to_deploy) || '--'}
                      </Line>
                    </TableCell>
                  )}
                  {enabledColumnsSet.has('lead_time') && (
                    <TableCell sx={{ p: CELL_PAD }}>
                      <MiniLeadTimeStat
                        lead={pr.lead_time}
                        response={pr.first_response_time}
                        commit={Math.max(0, pr.first_commit_to_open)}
                        rework={pr.rework_time}
                        release={pr.merge_time}
                        deploy={pr.merge_to_deploy}
                      />
                    </TableCell>
                  )}
                  {enabledColumnsSet.has('created_at') && (
                    <TableCell>
                      <FlexBox width="max-content">
                        {format(new Date(pr.created_at), 'do MMM')}
                      </FlexBox>
                    </TableCell>
                  )}
                  {enabledColumnsSet.has('updated_at') && (
                    <TableCell>
                      <FlexBox width="max-content">
                        {format(new Date(pr.updated_at), 'do MMM')}
                      </FlexBox>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {pageCount > 1 && (
        <Pagination
          page={page.value}
          count={pageCount}
          onChange={(_, p) => page.set(p)}
        />
      )}
    </FlexBox>
  );
};

const PrChangesTooltip: FC<{ pr: PR }> = ({ pr }) => {
  return (
    <Box
      display="grid"
      gridTemplateColumns="auto 1fr"
      columnGap={2}
      fontSize="1.2em"
    >
      <Box gridArea="1 / 1 / 2 / 3" fontWeight={700} mb={1}>
        Git changes
      </Box>

      <Box>Commits</Box>
      <Box textAlign="right">{pr.commits}</Box>
      <Box>Lines</Box>
      <Box textAlign="right">{pr.additions + pr.deletions}</Box>
      <Box>Comments</Box>
      <Box textAlign="right">{pr.comments}</Box>
      <Box>Files</Box>
      <Box textAlign="right">{pr.changed_files}</Box>
    </Box>
  );
};

const PrReviewersCell: FC<{ pr: PR }> = ({ pr }) => {
  const theme = useTheme();
  return (
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
              <Box>{`@${reviewer.username}`}</Box>
              {!reviewer.linked_user && (
                <Box fontStyle="italic" color="secondary.dark">
                  User not added to Middleware
                </Box>
              )}
            </Box>
          }
          key={reviewer.username}
          component={Link}
          href={getGHAvatar(reviewer.username)}
          target="_blank"
          fontWeight={500}
          display="flex"
          alignItems="center"
        >
          <Avatar
            {...stringAvatar(
              (reviewer.linked_user?.name || reviewer.username).toUpperCase(),
              {
                size: '1.7em',
                boxShadow: `0 0 0 2px ${theme.colors.info.main}`
              }
            )}
            src={getGHAvatar(reviewer.username)}
          />
        </FlexBox>
      ))}
    </FlexBox>
  );
};

const PrMetaCell: FC<{ pr: PR }> = ({ pr }) => {
  const theme = useTheme();

  const linesChanged = pr.additions + pr.deletions;
  const linedAddedChunks = Math.floor(((pr.additions / linesChanged) * 10) / 2);
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
      ...staticArray<string>(5 - linedAddedChunks - linedDeletedChunks).fill(
        lighten(theme.colors.secondary.main, 0.4)
      )
    );

  return (
    <Box
      display="grid"
      columnGap={1}
      rowGap={1 / 2}
      gridTemplateColumns="65px 1fr"
      gridTemplateRows="repeat(3, auto)"
      component={Link}
      href={pr.pr_link}
      target="_blank"
      underline="none"
      color="inherit"
    >
      <Box textAlign="right" gridArea="2 / 1 / 3 / 2">
        <Box
          component={Link}
          fontSize="1.1em"
          fontWeight={500}
          href={pr.pr_link}
          target="_blank"
        >
          #{pr.number}
        </Box>
      </Box>
      <Box fontSize="small" color="secondary.main" gridArea="1 / 2 / 2 / 3">
        {pr.repo_name}
      </Box>
      <Box fontSize="1.1em" fontWeight={500} gridArea="2 / 2 / 3 / 3">
        {pr.title ? (
          <Line color="inherit" underline>
            {pr.title}
          </Line>
        ) : (
          <Line color="secondary.dark" italic>
            PR title couldn't be fetched
          </Line>
        )}
      </Box>
      <Box
        gridArea="3 / 1 / 4 / 2"
        fontSize="smaller"
        textAlign="right"
        color="secondary.main"
      >
        {format(new Date(pr.updated_at), 'do, MMM')}
      </Box>
      <Box fontSize="smaller" gridArea="3 / 2 / 4 / 3">
        <Box display="flex" alignItems="center" gap={1 / 2}>
          <Box fontWeight={700} color={getColorByStatus(pr.state)}>
            {pr.state}
          </Box>
          <Divider
            orientation="vertical"
            sx={{
              height: theme.spacing(1),
              backgroundColor: theme.colors.secondary.light
            }}
          />
          <LightTooltip
            arrow
            placement="right"
            title={`${pr.changed_files} ${pluralize(
              'files',
              pr.changed_files
            )} changed`}
          >
            <Box display="flex" alignItems="center" gap={1 / 2}>
              <Box
                display="flex"
                alignItems="center"
                gap={1 / 2}
                fontWeight={600}
              >
                <Box color={lighten(theme.colors.success.main, 0.4)}>
                  +{pr.additions}
                </Box>
                <Box color={lighten(theme.colors.error.main, 0.4)}>
                  -{pr.deletions}
                </Box>
              </Box>
              <Box display="flex" gap={1 / 4}>
                {changesBoxColors.map((color, i) => (
                  <Box
                    key={i}
                    height={theme.spacing(1)}
                    width={theme.spacing(1)}
                    borderRadius={1}
                    bgcolor={color}
                  />
                ))}
              </Box>
            </Box>
          </LightTooltip>
          {pr.original_reverted_pr && (
            <FlexBox alignBase gap={1 / 2}>
              <Divider
                orientation="vertical"
                sx={{
                  height: theme.spacing(1),
                  backgroundColor: theme.colors.secondary.light
                }}
              />
              <UndoRoundedIcon
                fontSize="inherit"
                color="warning"
                sx={{ position: 'relative', top: '2px' }}
              />{' '}
              Reverts PR{' '}
              <Box
                component={Link}
                fontSize="1.1em"
                fontWeight={500}
                href={pr.pr_link}
                target="_blank"
              >
                #{pr.original_reverted_pr.number}
              </Box>
            </FlexBox>
          )}
        </Box>
        <Box>
          {pr.head_branch} →{' '}
          <Box
            component="span"
            fontWeight={700}
            color={brandColors.pr.mergeTime}
          >
            {pr.base_branch}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export const MiniLeadTimeCore: FC<
  {
    lead?: number;
    commit?: number;
    response?: number;
    rework?: number;
    release?: number;
    deploy?: number;
  } & BoxProps
> = ({
  lead = 0,
  commit = 0,
  release = 0,
  response = 0,
  rework = 0,
  deploy = 0,
  ...props
}) => {
  const theme = useTheme();

  const defaultFlex = !lead ? 1 : 0;

  return (
    <Box
      display="flex"
      borderRadius={1 / 2}
      overflow="hidden"
      width="100%"
      flex={1}
      maxWidth="500px"
      {...props}
    >
      <Box
        bgcolor={brandColors.pr.open}
        color={theme.palette.background.default}
        fontWeight={700}
        mx={-1 / 2}
        py={1 / 2}
        pl={2.5}
        pr={3}
        minWidth={0}
        height="30px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        whiteSpace="nowrap"
        flex={commit || defaultFlex}
        sx={{
          clipPath: `polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%)`
        }}
      >
        {getDurationString(commit || 0, {
          segments: commit > secondsInDay ? 2 : 1
        }) || '-'}
      </Box>
      <Box
        bgcolor={brandColors.pr.firstResponseTime}
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
        flex={response || defaultFlex}
        sx={{
          clipPath: `polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%, 10px 50%)`
        }}
      >
        {getDurationString(response || 0, {
          segments: response > secondsInDay ? 2 : 1
        }) || '-'}
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
        {getDurationString(rework || 0, {
          segments: rework > secondsInDay ? 2 : 1
        }) || '-'}
      </Box>
      <Box
        bgcolor={brandColors.pr.mergeTime}
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
        flex={release || defaultFlex}
        sx={{
          clipPath: `polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%, 10px 50%)`
        }}
      >
        {getDurationString(release || 0, {
          segments: release > secondsInDay ? 2 : 1
        }) || '-'}
      </Box>
      <Box
        bgcolor={brandColors.meet.scheduled}
        color={theme.palette.background.default}
        fontWeight={700}
        mx={-1 / 2}
        py={1 / 2}
        pl={3}
        pr={2.5}
        minWidth={0}
        height="30px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        whiteSpace="nowrap"
        flex={deploy || defaultFlex}
        sx={{
          clipPath: `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 10px 50%)`
        }}
      >
        {getDurationString(deploy || 0, {
          segments: deploy > secondsInDay ? 2 : 1
        }) || '-'}
      </Box>
    </Box>
  );
};

export const CycleTimePill: FC<{ time: number } & BoxProps> = ({
  time,
  ...props
}) => {
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
      {...props}
    >
      {getDurationString(time) || '-'}
    </Box>
  );
};

export const MiniCycleTimeLabels = ({
  showLead = false
}: {
  showLead?: boolean;
}) => {
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
      {showLead && (
        <>
          <Box color={brandColors.pr.open}>Commit</Box>
          <Box
            color="white"
            fontSize="1.2em"
            display="flex"
            alignItems="center"
          >
            <ArrowForwardRounded fontSize="inherit" color="secondary" />
          </Box>
        </>
      )}
      <Box color={brandColors.pr.firstResponseTime}>Response</Box>
      <Box color="white" fontSize="1.2em" display="flex" alignItems="center">
        <ArrowForwardRounded fontSize="inherit" color="secondary" />
      </Box>
      <Box color={brandColors.pr.reworkTime}>Rework</Box>
      <Box color="white" fontSize="1.2em" display="flex" alignItems="center">
        <ArrowForwardRounded fontSize="inherit" color="secondary" />
      </Box>
      <Box color={brandColors.pr.mergeTime}>Merge</Box>
      {showLead && (
        <>
          <Box
            color="white"
            fontSize="1.2em"
            display="flex"
            alignItems="center"
          >
            <ArrowForwardRounded fontSize="inherit" color="secondary" />
          </Box>
          <Box color={brandColors.meet.scheduled}>Deploy</Box>
        </>
      )}
    </Box>
  );
};

export const MiniLeadTimeStat: FC<{
  lead?: number;
  commit?: number;
  response?: number;
  rework?: number;
  release?: number;
  deploy?: number;
}> = ({
  lead = 0,
  commit = 0,
  release = 0,
  response = 0,
  rework = 0,
  deploy = 0
}) => {
  const missingState =
    !commit && !deploy
      ? 'TOTAL'
      : Boolean(commit) !== Boolean(deploy)
      ? 'PARTIAL'
      : null;

  return (
    <FlexBox
      alignCenter
      gap1
      darkTip
      title={
        <>
          {missingState && (
            <Line mb={1 / 2} tiny>
              Could not show complete Lead Time due to commit or deploy time
              being missing
            </Line>
          )}
          <MiniLeadTimeCore
            lead={lead}
            commit={commit}
            release={release}
            response={response}
            rework={rework}
            deploy={deploy}
            mb={1}
          />
          <MiniCycleTimeLabels showLead />
        </>
      }
      tooltipPlacement="left"
    >
      <CycleTimePill time={lead} />
    </FlexBox>
  );
};

const useLeadTimeMigration = () => {
  const prEnabledConfig = useSelector((s) => s.app.prTableColumnsConfig) as any;
  const dispatch = useDispatch();
  useEffect(() => {
    if (prEnabledConfig?.lead_time_as_sum_of_parts !== undefined) {
      const updatedColumns = { ...prEnabledConfig };
      updatedColumns.lead_time = updatedColumns.lead_time_as_sum_of_parts;
      delete updatedColumns.lead_time_as_sum_of_parts;
      dispatch(appSlice.actions.setPrTableColumnConfig(updatedColumns));
    }
  }, [dispatch, prEnabledConfig]);
};
