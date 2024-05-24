import { TableCell, TableHead, TableRow, TableSortLabel } from '@mui/material';
import { FC } from 'react';

import { TableSort } from '@/hooks/useTableSort';
import { PR } from '@/types/resources';

export const CELL_PAD = 1;

export type PullRequestsTableHeadProps = Pick<
  TableSort<PR>,
  'conf' | 'updateSortConf'
> & { hideColumns?: Set<keyof PR> };

export const PullRequestsTableHeadMini: FC<PullRequestsTableHeadProps> = ({
  conf,
  updateSortConf,
  hideColumns
}) => {
  return (
    <TableHead>
      <TableRow
        sx={{
          '.MuiTableSortLabel-root.Mui-active': {
            fontWeight: 'bold',
            color: 'white'
          }
        }}
      >
        <TableCell sx={{ minWidth: '40%', p: CELL_PAD, py: 1.5 }}>
          <TableSortLabel
            direction={conf.field === 'created_at' ? conf.order : 'asc'}
            active={conf.field === 'created_at'}
            onClick={() => updateSortConf('created_at')}
          >
            Pull Request
          </TableSortLabel>
        </TableCell>
        {!hideColumns?.has('commits') && (
          <TableCell sx={{ p: CELL_PAD, py: 1.5 }}>
            <TableSortLabel
              direction={conf.field === 'commits' ? conf.order : 'asc'}
              active={conf.field === 'commits'}
              onClick={() => updateSortConf('commits')}
            >
              Stats
            </TableSortLabel>
          </TableCell>
        )}

        {!hideColumns?.has('rework_cycles') && (
          <TableCell sx={{ p: CELL_PAD, py: 1.5 }}>
            <TableSortLabel
              direction={conf.field === 'rework_cycles' ? conf.order : 'asc'}
              active={conf.field === 'rework_cycles'}
              onClick={() => updateSortConf('rework_cycles')}
            >
              Rework
            </TableSortLabel>
          </TableCell>
        )}
        {!hideColumns?.has('author') && (
          <TableCell sx={{ p: CELL_PAD, py: 1.5 }}>
            <TableSortLabel
              direction={conf.field === 'author' ? conf.order : 'asc'}
              active={conf.field === 'author'}
              onClick={() => updateSortConf('author')}
            >
              Author
            </TableSortLabel>
          </TableCell>
        )}
        {!hideColumns?.has('reviewers') && (
          <TableCell sx={{ p: CELL_PAD, py: 1.5 }}>
            <TableSortLabel
              direction={conf.field === 'reviewers' ? conf.order : 'asc'}
              active={conf.field === 'reviewers'}
              onClick={() => updateSortConf('reviewers')}
            >
              Review
            </TableSortLabel>
          </TableCell>
        )}
        {!hideColumns?.has('lead_time') && (
          <TableCell sx={{ p: CELL_PAD, py: 1.5 }}>
            <TableSortLabel
              direction={conf.field === 'lead_time' ? conf.order : 'asc'}
              active={conf.field === 'lead_time'}
              onClick={() => updateSortConf('lead_time')}
            >
              Lead
            </TableSortLabel>
          </TableCell>
        )}
      </TableRow>
    </TableHead>
  );
};
