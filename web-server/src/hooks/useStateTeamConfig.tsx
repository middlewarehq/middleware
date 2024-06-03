import { differenceInDays, differenceInWeeks, format } from 'date-fns';
import { daysInWeek } from 'date-fns/constants';
import { useCallback, useMemo } from 'react';

import { DateRange, DateRangeMap } from '@/components/DateRangePicker';
import { useDateRangeUpdateHandler } from '@/components/DateRangePicker/useDateRangeUpdateHandler';
import {
  QuickRangeOptions,
  DateRangeLogic
} from '@/components/DateRangePicker/utils';
import { Line } from '@/components/Text';
import { appSlice, SerializableDateRange } from '@/slices/app';
import { useDispatch, useSelector } from '@/store';
import { ActiveBranchMode } from '@/types/resources';

export const useStateDateConfig = (): DateRangeMap & {
  partiallyUnselected: boolean;
  weeksCovered: number;
  daysCovered: number;
} => {
  const dateRange = useSelector((state) => state.app.dateRange);
  const dateMode = useSelector((state) => state.app.dateMode);

  const [startDate, endDate] = useMemo(() => {
    const isDefaultsSelectedPreviously = dateMode && dateMode !== 'custom';
    const fallbackRange = [dateRange[0], dateRange[1]];
    return isDefaultsSelectedPreviously
      ? DateRangeLogic[dateMode]?.() || fallbackRange
      : fallbackRange;
  }, [dateMode, dateRange]);

  const partiallyUnselected =
    dateRange.filter(Boolean).length < dateRange.length;

  return useMemo(() => {
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date();
    const weeksCovered = differenceInWeeks(end, start);
    const daysCovered = differenceInDays(end, start) % daysInWeek;

    return {
      start,
      end,
      partiallyUnselected,
      weeksCovered,
      daysCovered
    };
  }, [endDate, startDate, partiallyUnselected]);
};

export const useCurrentDateRangeLabel = () => {
  const { start, end, partiallyUnselected } = useStateDateConfig();
  return !partiallyUnselected
    ? `${format(start, 'do MMM')} to ${format(end, 'do MMM')}`
    : 'Select Date Range';
};

export const useStateTeamConfig = () => {
  const dispatch = useDispatch();
  const mode = useSelector((state) => state.app.branchMode);
  const { start, end, partiallyUnselected } = useStateDateConfig();
  const isAllMode = mode === ActiveBranchMode.ALL;
  const dates = useMemo(
    () => ({ start, end, partiallyUnselected }),
    [end, partiallyUnselected, start]
  );
  const dateRange = useMemo(() => [start, end] as DateRange, [end, start]);

  const stateSingleTeam = useSelector((state) => state.app.singleTeam);
  const singleTeam = useMemo(
    () => stateSingleTeam.filter((team) => team?.id),
    [stateSingleTeam]
  );

  const dateRangeUpdateHandler = useDateRangeUpdateHandler();
  const teamId = singleTeam?.[0]?.id;

  const setRange = useCallback(
    (
      range: DateRange,
      dateMode: QuickRangeOptions,
      onRangeSet?: (newRange: DateRange) => void
    ) => {
      const newRange = dateRangeUpdateHandler(range, dateRange);
      dispatch(
        appSlice.actions.setDateRange({
          dateRange: newRange.map(
            (date) => date?.toISOString()
          ) as SerializableDateRange,
          dateMode: dateMode
        })
      );
      onRangeSet?.(newRange);
    },
    [dateRange, dateRangeUpdateHandler, dispatch]
  );
  const teamReposProdBranchArray = useSelector(
    (state) => state.app.teamsProdBranchMap?.[singleTeam?.[0]?.id]
  );

  const singleTeamProdBranchesConfig = useMemo(
    () =>
      teamReposProdBranchArray?.reduce(
        (prevValue, t) => {
          prevValue[t.org_repo_id] = {
            base_branches: isAllMode
              ? []
              : t.prod_branches?.filter(Boolean) || []
          };
          return { ...prevValue };
        },
        {} as Record<string, { base_branches: string[] }>
      ) || {},
    [isAllMode, teamReposProdBranchArray]
  );

  return {
    dateRange,
    dates,
    singleTeam,
    singleTeamId: singleTeam?.[0]?.id,
    singleTeamMemberFilter: Boolean(singleTeam?.[0]?.member_filter_enabled),
    setRange,
    partiallyUnselected,
    teamId,
    singleTeamProdBranchesConfig
  };
};

export const useSingleTeamConfig = () => {
  const {
    singleTeam,
    singleTeamId,
    dates,
    partiallyUnselected,
    singleTeamProdBranchesConfig
  } = useStateTeamConfig();
  const singleTeamName = singleTeam[0]?.name;
  const noTeamSelected = !Boolean(singleTeamId);
  const noMembers = !Boolean(singleTeam?.[0]?.member_ids?.length);

  return {
    team: singleTeam?.[0],
    singleTeam,
    singleTeamId,
    memberFilter: Boolean(singleTeam?.[0]?.member_filter_enabled),
    singleTeamName,
    noTeamSelected,
    noMembers,
    dates,
    partiallyUnselected,
    singleTeamProdBranchesConfig
  };
};

export const useStateBranchConfig = () => {
  const branchMode = useSelector((s) => s.app.branchMode);
  const branchNames = useSelector((s) => s.app.branchNames);
  if (branchMode === ActiveBranchMode.ALL) return '^';
  return branchNames;
};

export const useBranchesForPrFilters = () => {
  const branches = useStateBranchConfig();
  const activeBranchMode = useSelector((s) => s.app.branchMode);

  return useMemo(
    () => ({
      branches: activeBranchMode === ActiveBranchMode.CUSTOM ? branches : null,
      branch_mode: activeBranchMode
    }),
    [activeBranchMode, branches]
  );
};

export const useCurrentDateRangeReactNode = () => {
  const { start, end, partiallyUnselected } = useStateDateConfig();
  return !partiallyUnselected ? (
    <Line>
      <Line color="info" medium>
        {format(start, 'do MMM')}
      </Line>{' '}
      to{' '}
      <Line color="info" medium>
        {format(end, 'do MMM')}
      </Line>
    </Line>
  ) : (
    <Line>Select Date Range</Line>
  );
};
