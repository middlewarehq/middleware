import { ScheduleRounded } from '@mui/icons-material';
import {
  Box,
  Checkbox,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel
} from '@mui/material';
import { FC } from 'react';

import { DarkTooltip } from '@/components/Shared';
import { EasyState } from '@/hooks/useEasyState';
import { TableSort } from '@/hooks/useTableSort';
import { DEFAULT_PR_TABLE_COLUMN_STATE_MAP } from '@/slices/app';
import { PR } from '@/types/resources';

import { GitBranchIcon } from '../RepoCard';

export const CELL_PAD = 1;

export type PullRequestsTableHeadProps = Pick<
  TableSort<PR>,
  'conf' | 'updateSortConf'
> & {
  prs?: PR[];
  selectedPrIds?: EasyState<ID[]>;
  enabledColumnsSet?: Set<keyof typeof DEFAULT_PR_TABLE_COLUMN_STATE_MAP>;
  isPrSelectionEnabled?: boolean;
  count: number;
};

export const PullRequestsTableHead: FC<PullRequestsTableHeadProps> = ({
  prs,
  selectedPrIds,
  conf,
  updateSortConf,
  enabledColumnsSet,
  isPrSelectionEnabled,
  count
}) => {
  const noPrsSelected = !Boolean(selectedPrIds.value.length);
  const somePrsSelected =
    selectedPrIds.value.length > 0 && selectedPrIds.value.length < prs.length;
  const allPrsSelected = selectedPrIds.value.length === prs.length;

  return (
    <TableHead>
      <TableRow
        sx={{
          '.MuiTableSortLabel-root.Mui-active': {
            fontWeight: 'bold',
            color: 'white'
          },
          '.MuiTableCell-head': {
            whiteSpace: 'nowrap',
            textAlign: 'left'
          }
        }}
      >
        {isPrSelectionEnabled && (
          <TableCell>
            <DarkTooltip
              title={`Select to exclude ${
                count > 1 ? `ALL ${count} PRs` : `the PR`
              } in this table from all PR analysis via the button above the table`}
            >
              <Checkbox
                checked={allPrsSelected}
                indeterminate={somePrsSelected}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  if (isChecked && noPrsSelected) {
                    selectedPrIds.set(prs.map((pr) => pr.id));
                    return;
                  }
                  if (!isChecked && allPrsSelected) {
                    selectedPrIds.set([]);
                    return;
                  }
                  if (isChecked && somePrsSelected) {
                    selectedPrIds.set(prs.map((pr) => pr.id));
                  }
                }}
              />
            </DarkTooltip>
          </TableCell>
        )}
        <TableCell sx={{ minWidth: '40%', p: CELL_PAD, py: 1.5 }}>
          <TableSortLabel
            direction={conf.field === 'updated_at' ? conf.order : 'asc'}
            active={conf.field === 'updated_at'}
            onClick={() => updateSortConf('updated_at')}
          >
            Pull Request
          </TableSortLabel>
        </TableCell>
        <TableCell sx={{ p: CELL_PAD, py: 1.5 }}>
          <TableSortLabel
            direction={conf.field === 'commits' ? conf.order : 'asc'}
            active={conf.field === 'commits'}
            onClick={() => {
              if (enabledColumnsSet?.has('commits')) {
                return updateSortConf('commits');
              }
              if (enabledColumnsSet?.has('lines_changed')) {
                return updateSortConf('additions');
              }
              if (enabledColumnsSet?.has('comments')) {
                return updateSortConf('comments');
              }
            }}
          >
            <Box
              display="flex"
              gap={1}
              alignItems="center"
              justifyContent="center"
            >
              {enabledColumnsSet?.has('commits') && (
                <>
                  <Box color="secondary.main">Commits</Box>
                  <Box>/</Box>
                </>
              )}
              {enabledColumnsSet?.has('lines_changed') && (
                <>
                  <Box color="warning.main">Lines</Box>
                  <Box>/</Box>
                </>
              )}
              {enabledColumnsSet?.has('comments') && (
                <Box color="info.main">Comments</Box>
              )}
            </Box>
          </TableSortLabel>
        </TableCell>
        {enabledColumnsSet.has('base_branch') && (
          <TableCell
            align="center"
            sx={{ p: CELL_PAD, py: 1.5, whiteSpace: 'nowrap' }}
          >
            <TableSortLabel
              direction={conf.field === 'base_branch' ? conf.order : 'asc'}
              active={conf.field === 'base_branch'}
              onClick={() => updateSortConf('base_branch')}
            >
              Base <GitBranchIcon sx={{ height: '1.2em', ml: 1 / 2 }} />
            </TableSortLabel>
          </TableCell>
        )}
        {enabledColumnsSet.has('head_branch') && (
          <TableCell
            align="center"
            sx={{ p: CELL_PAD, py: 1.5, whiteSpace: 'nowrap' }}
          >
            <TableSortLabel
              direction={conf.field === 'head_branch' ? conf.order : 'asc'}
              active={conf.field === 'head_branch'}
              onClick={() => updateSortConf('head_branch')}
            >
              Head <GitBranchIcon sx={{ height: '1.2em', ml: 1 / 2 }} />
            </TableSortLabel>
          </TableCell>
        )}
        {enabledColumnsSet.has('changed_files') && (
          <TableCell align="center" sx={{ p: CELL_PAD, py: 1.5 }}>
            <TableSortLabel
              direction={conf.field === 'changed_files' ? conf.order : 'asc'}
              active={conf.field === 'changed_files'}
              onClick={() => updateSortConf('changed_files')}
            >
              Files Changed
            </TableSortLabel>
          </TableCell>
        )}
        {enabledColumnsSet.has('rework_cycles') && (
          <TableCell align="center" sx={{ p: CELL_PAD, py: 1.5 }}>
            <TableSortLabel
              direction={conf.field === 'rework_cycles' ? conf.order : 'asc'}
              active={conf.field === 'rework_cycles'}
              onClick={() => updateSortConf('rework_cycles')}
            >
              Rework
            </TableSortLabel>
          </TableCell>
        )}
        {enabledColumnsSet.has('author') && (
          <TableCell align="center" sx={{ p: CELL_PAD, py: 1.5 }}>
            <TableSortLabel
              direction={conf.field === 'author' ? conf.order : 'asc'}
              active={conf.field === 'author'}
              onClick={() => updateSortConf('author')}
            >
              Author
            </TableSortLabel>
          </TableCell>
        )}
        {enabledColumnsSet.has('reviewers') && (
          <TableCell align="center" sx={{ p: CELL_PAD, py: 1.5 }}>
            <TableSortLabel
              direction={conf.field === 'reviewers' ? conf.order : 'asc'}
              active={conf.field === 'reviewers'}
              onClick={() => updateSortConf('reviewers')}
            >
              Reviewer
            </TableSortLabel>
          </TableCell>
        )}
        {enabledColumnsSet.has('first_response_time') && (
          <TableCell align="center" sx={{ p: CELL_PAD, py: 1.5 }}>
            <TableSortLabel
              direction={
                conf.field === 'first_response_time' ? conf.order : 'asc'
              }
              active={conf.field === 'first_response_time'}
              onClick={() => updateSortConf('first_response_time')}
            >
              Response <ClockIcon />
            </TableSortLabel>
          </TableCell>
        )}
        {enabledColumnsSet.has('first_commit_to_open') && (
          <TableCell align="center" sx={{ p: CELL_PAD, py: 1.5 }}>
            <TableSortLabel
              direction={
                conf.field === 'first_commit_to_open' ? conf.order : 'asc'
              }
              active={conf.field === 'first_commit_to_open'}
              onClick={() => updateSortConf('first_commit_to_open')}
            >
              Commit to Open <ClockIcon />
            </TableSortLabel>
          </TableCell>
        )}
        {enabledColumnsSet.has('rework_time') && (
          <TableCell align="center" sx={{ p: CELL_PAD, py: 1.5 }}>
            <TableSortLabel
              direction={conf.field === 'rework_time' ? conf.order : 'asc'}
              active={conf.field === 'rework_time'}
              onClick={() => updateSortConf('rework_time')}
            >
              Rework <ClockIcon />
            </TableSortLabel>
          </TableCell>
        )}
        {enabledColumnsSet.has('merge_time') && (
          <TableCell align="center" sx={{ p: CELL_PAD, py: 1.5 }}>
            <TableSortLabel
              direction={conf.field === 'merge_time' ? conf.order : 'asc'}
              active={conf.field === 'merge_time'}
              onClick={() => updateSortConf('merge_time')}
            >
              Merge <ClockIcon />
            </TableSortLabel>
          </TableCell>
        )}
        {enabledColumnsSet.has('merge_to_deploy') && (
          <TableCell sx={{ p: CELL_PAD, py: 1.5 }}>
            <TableSortLabel
              direction={conf.field === 'merge_to_deploy' ? conf.order : 'asc'}
              active={conf.field === 'merge_to_deploy'}
              onClick={() => updateSortConf('merge_to_deploy')}
            >
              Merge to Deploy <ClockIcon />
            </TableSortLabel>
          </TableCell>
        )}
        {enabledColumnsSet.has('cycle_time') && (
          <TableCell sx={{ p: CELL_PAD, py: 1.5 }}>
            <TableSortLabel
              direction={conf.field === 'cycle_time' ? conf.order : 'asc'}
              active={conf.field === 'cycle_time'}
              onClick={() => updateSortConf('cycle_time')}
            >
              Cycle <ClockIcon />
            </TableSortLabel>
          </TableCell>
        )}
        {enabledColumnsSet.has('lead_time_as_sum_of_parts') && (
          <TableCell sx={{ p: CELL_PAD, py: 1.5 }}>
            <TableSortLabel
              direction={
                conf.field === 'lead_time_as_sum_of_parts' ? conf.order : 'asc'
              }
              active={conf.field === 'lead_time_as_sum_of_parts'}
              onClick={() => updateSortConf('lead_time_as_sum_of_parts')}
            >
              Lead <ClockIcon />
            </TableSortLabel>
          </TableCell>
        )}
        {enabledColumnsSet.has('created_at') && (
          <TableCell>
            <TableSortLabel
              direction={conf.field === 'created_at' ? conf.order : 'asc'}
              active={conf.field === 'created_at'}
              onClick={() => updateSortConf('created_at')}
            >
              Created
            </TableSortLabel>
          </TableCell>
        )}
        {enabledColumnsSet.has('updated_at') && (
          <TableCell>
            <TableSortLabel
              direction={conf.field === 'updated_at' ? conf.order : 'asc'}
              active={conf.field === 'updated_at'}
              onClick={() => updateSortConf('updated_at')}
            >
              Updated
            </TableSortLabel>
          </TableCell>
        )}
      </TableRow>
    </TableHead>
  );
};

const ClockIcon = () => (
  <ScheduleRounded sx={{ fontSize: '1.2em', ml: 1 / 2, opacity: 0.7 }} />
);
