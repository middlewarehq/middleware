import { ScheduleRounded } from '@mui/icons-material';
import {
  Checkbox,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel
} from '@mui/material';
import { FC } from 'react';
import { saveAs } from 'file-saver';
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
  const downloadCsv = () => {
    if (!prs?.length) return;

    const headers = [
      'Pull Request',
      enabledColumnsSet.has('commits') ? 'Commits' : '',
      enabledColumnsSet.has('lines_changed') ? 'Lines Changed' : '',
      enabledColumnsSet.has('comments') ? 'Comments' : '',
      enabledColumnsSet.has('base_branch') ? 'Base Branch' : '',
      enabledColumnsSet.has('head_branch') ? 'Head Branch' : '',
      enabledColumnsSet.has('changed_files') ? 'Files Changed' : '',
      enabledColumnsSet.has('rework_cycles') ? 'Rework Cycles' : '',
      enabledColumnsSet.has('author') ? 'Author' : '',
      enabledColumnsSet.has('reviewers') ? 'Reviewer' : '',
      enabledColumnsSet.has('first_commit_to_open') ? 'Commit to Open' : '',
      enabledColumnsSet.has('first_response_time') ? 'Response Time' : '',
      enabledColumnsSet.has('rework_time') ? 'Rework Time' : '',
      enabledColumnsSet.has('merge_time') ? 'Merge Time' : '',
      enabledColumnsSet.has('merge_to_deploy') ? 'Merge to Deploy' : '',
      enabledColumnsSet.has('lead_time') ? 'Lead Time' : '',
      enabledColumnsSet.has('created_at') ? 'Created At' : '',
      enabledColumnsSet.has('updated_at') ? 'Updated At' : ''
    ].filter(Boolean);

    const rows = prs.map((pr) => [
      pr.number,
      enabledColumnsSet.has('commits') ? pr.commits : '',
      enabledColumnsSet.has('lines_changed') ? pr.lines_changed : '',
      enabledColumnsSet.has('comments') ? pr.comments : '',
      enabledColumnsSet.has('base_branch') ? pr.base_branch : '',
      enabledColumnsSet.has('head_branch') ? pr.head_branch : '',
      enabledColumnsSet.has('changed_files') ? pr.changed_files : '',
      enabledColumnsSet.has('rework_cycles') ? pr.rework_cycles : '',
      enabledColumnsSet.has('author') ? pr.author : '',
      enabledColumnsSet.has('reviewers') ? pr.reviewers.join(', ') : '',
      enabledColumnsSet.has('first_commit_to_open') ? pr.first_commit_to_open : '',
      enabledColumnsSet.has('first_response_time') ? pr.first_response_time : '',
      enabledColumnsSet.has('rework_time') ? pr.rework_time : '',
      enabledColumnsSet.has('merge_time') ? pr.merge_time : '',
      enabledColumnsSet.has('merge_to_deploy') ? pr.merge_to_deploy : '',
      enabledColumnsSet.has('lead_time') ? pr.lead_time : '',
      enabledColumnsSet.has('created_at') ? pr.created_at : '',
      enabledColumnsSet.has('updated_at') ? pr.updated_at : ''
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const blob = new Blob([decodeURIComponent(encodedUri)], {
      type: 'text/csv;charset=utf-8;'
    });
    saveAs(blob, 'pull_requests.csv');
  };

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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
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
            direction={conf.field === 'number' ? conf.order : 'asc'}
            active={conf.field === 'number'}
            onClick={() => updateSortConf('number')}
          >
            Pull Request
          </TableSortLabel>
        </TableCell>

        {enabledColumnsSet.has('commits') && (
          <TableCell sx={{ minWidth: '40%', p: CELL_PAD, py: 1.5 }}>
            <TableSortLabel
              direction={conf.field === 'commits' ? conf.order : 'asc'}
              active={conf.field === 'commits'}
              onClick={() => updateSortConf('commits')}
            >
              Commits
            </TableSortLabel>
          </TableCell>
        )}

        {enabledColumnsSet.has('lines_changed') && (
          <TableCell sx={{ minWidth: '40%', p: CELL_PAD, py: 1.5 }}>
            <TableSortLabel
              direction={conf.field === 'additions' ? conf.order : 'asc'}
              active={conf.field === 'additions'}
              onClick={() => updateSortConf('additions')}
            >
              Lines
            </TableSortLabel>
          </TableCell>
        )}

        {enabledColumnsSet.has('comments') && (
          <TableCell sx={{ minWidth: '40%', p: CELL_PAD, py: 1.5 }}>
            <TableSortLabel
              direction={conf.field === 'comments' ? conf.order : 'asc'}
              active={conf.field === 'comments'}
              onClick={() => updateSortConf('comments')}
            >
              Comments
            </TableSortLabel>
          </TableCell>
        )}

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
        {enabledColumnsSet.has('lead_time') && (
          <TableCell sx={{ p: CELL_PAD, py: 1.5 }}>
            <TableSortLabel
              direction={conf.field === 'lead_time' ? conf.order : 'asc'}
              active={conf.field === 'lead_time'}
              onClick={() => updateSortConf('lead_time')}
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
        <button onClick={downloadCsv}>Download CSV</button>
      </TableRow>
    </TableHead>
  );
};

const ClockIcon = () => (
  <ScheduleRounded sx={{ fontSize: '1.2em', ml: 1 / 2, opacity: 0.7 }} />
);
