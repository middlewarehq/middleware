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

const columnHeaders: Record<keyof PR, string> = {
  number: 'Pull Request',
  commits: 'Commits',
  lines_changed: 'Lines Changed',
  comments: 'Comments',
  base_branch: 'Base Branch',
  head_branch: 'Head Branch',
  changed_files: 'Files Changed',
  rework_cycles: 'Rework Cycles',
  author: 'Author',
  reviewers: 'Reviewer',
  first_commit_to_open: 'Commit to Open',
  first_response_time: 'Response Time',
  rework_time: 'Rework Time',
  merge_time: 'Merge Time',
  merge_to_deploy: 'Merge to Deploy',
  lead_time: 'Lead Time',
  created_at: 'Created At',
  updated_at: 'Updated At'
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

    // Create CSV headers dynamically
    const headers = Object.values(columnHeaders);

    // Create CSV rows
    const rows = prs.map((pr) =>
      Object.keys(columnHeaders).map((key) => pr[key as keyof PR] || '')
    );

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');

    // Create a Blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'pull_requests.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        {/* Map through the columnHeaders object to dynamically generate table headers */}
        {Object.entries(columnHeaders).map(([key, label]) => (
          <TableCell key={key} sx={{ minWidth: '40%', p: CELL_PAD, py: 1.5 }}>
            <TableSortLabel
              direction={conf.field === key ? conf.order : 'asc'}
              active={conf.field === key}
              onClick={() => updateSortConf(key as keyof PR)}
            >
              {label}
            </TableSortLabel>
          </TableCell>
        ))}

        {/* Button to trigger CSV download */}
        <button onClick={downloadCsv}>Download CSV</button>
      </TableRow>
    </TableHead>
  );
};

const ClockIcon = () => (
  <ScheduleRounded sx={{ fontSize: '1.2em', ml: 1 / 2, opacity: 0.7 }} />
);
