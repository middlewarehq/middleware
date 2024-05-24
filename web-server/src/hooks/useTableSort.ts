import { ascend, descend, head, partition, propOr, sort } from 'ramda';
import { useCallback, useMemo } from 'react';

import { track } from '@/constants/events';
import { useEasyState } from '@/hooks/useEasyState';
import { isObj } from '@/utils/datatype';
import { depFn } from '@/utils/fn';
import { isUuid } from '@/utils/unistring';

export const useTableSort = <T = Record<string, any>>(
  list: T[],
  defaultSortConfig: {
    field: keyof (typeof list)[number];
    order: 'asc' | 'desc';
  } = { field: Object.keys(list[0] || {})[0] as keyof T, order: 'desc' }
) => {
  const sortConfig = useEasyState(defaultSortConfig);

  const conf = sortConfig.value;

  const updateSortConf = useCallback(
    (field: keyof T) =>
      depFn(sortConfig.set, {
        field,
        order:
          conf.field !== field ? 'desc' : conf.order === 'asc' ? 'desc' : 'asc'
      }),
    [conf.field, conf.order, sortConfig.set]
  );

  const handleAuthorUsernameSort = useCallback(
    (rawList: any[]) => {
      if (!head(rawList || [])?.author?.username) return rawList;

      const result = [...rawList];
      if (conf.order === 'asc') {
        result.sort((a, b) => {
          return a.author.username.localeCompare(b.author.username);
        });
      } else {
        result.sort((b, a) => {
          return a.author.username.localeCompare(b.author.username);
        });
      }
      return result;
    },
    [conf.order]
  );

  const sortedList: T[] = useMemo(() => {
    if (conf.field === 'author') {
      return handleAuthorUsernameSort(list);
    } else
      return sort(
        // @ts-ignore
        conf.order === 'asc'
          ? // @ts-ignore
            ascend(propOr('', conf.field))
          : // @ts-ignore
            descend(propOr('', conf.field)),
        list
      );
  }, [conf.field, conf.order, handleAuthorUsernameSort, list]);

  const getCSV = useCallback(() => {
    createCsvFromList(list);
  }, [list]);

  return { sortedList, updateSortConf, conf, getCSV };
};

type TableSortHook<T = Record<string, any>> = (
  list: T[],
  defaultSortConfig: {
    field: keyof (typeof list)[number];
    order: 'asc' | 'desc';
  }
) => {
  sortedList: typeof list;
  conf: typeof defaultSortConfig;
  updateSortConf: (f: typeof defaultSortConfig.field) => any;
};

export type TableSort<T = Record<string, any>> = ReturnType<TableSortHook<T>>;

function downloadCSVFromString(content: string, filename: string): void {
  const csvContent =
    'data:text/csv;charset=utf-8,' + encodeURIComponent(content);
  const link = document.createElement('a');
  link.setAttribute('href', csvContent);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const getNestedValueFromCellItem = (cell: any) =>
  cell?.linked_user?.name || cell?.username;

const EXCLUDED_HEADERS = new Set([
  'next_sprint_id',
  'previous_sprint_id',
  'priority_order'
]);

const getNestedValueFromCell = (cell: any) => {
  if (Array.isArray(cell) && getNestedValueFromCellItem(cell[0])) {
    const values = cell.map(getNestedValueFromCellItem).filter(Boolean);
    if (values.length) return values.join(', ');
    return null;
  }

  return getNestedValueFromCellItem(cell);
};

const checkIfColumnShouldBeRemoved = (name: string, cell: any) => {
  if (
    EXCLUDED_HEADERS.has(name) ||
    isObj(cell) ||
    Array.isArray(cell) ||
    isUuid(String(cell)) === true
  )
    return true;

  return false;
};

const createCsvFromList = (list: Record<string, any>[]) => {
  if (!list.length) return;

  track('CSV_EXPORT_TRIGGERED', { rows: list.length });

  const [includedCols, _excludedCols] = partition(([k, v]: [string, any]) => {
    if (!checkIfColumnShouldBeRemoved(k, v)) return true;

    return false;
  }, Object.entries(list[0])).map((sublist) => sublist.map((t) => t[0]));

  const includedSet = new Set(includedCols);

  // const headers = Object.keys(list[0]);
  const rows = list.map((row) =>
    Object.entries(row)
      .filter(([k]) => includedSet.has(k))
      .map(([, v]) => v)
      .map((cell) => {
        if (cell === null || cell === undefined) return '';

        const nestedPickedValue = getNestedValueFromCell(cell);

        return nestedPickedValue
          ? nestedPickedValue
          : JSON.stringify(cell)?.replaceAll(',', '，'); // the weird comma is intentional
      })
      .join(',')
  );

  const headers = [...includedSet.keys()];

  downloadCSVFromString(
    [headers.join(','), ...rows].join('\n'),
    'middleware-export.csv'
  );
};
