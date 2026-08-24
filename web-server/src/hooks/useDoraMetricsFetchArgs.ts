import { useMemo } from 'react';

import { useSelectedContributors } from '@/components/ContributorFilter';
import { useAuth } from '@/hooks/useAuth';
import { useSingleTeamConfig } from '@/hooks/useStateTeamConfig';

/**
 * The org / team / date-window / contributor arguments that every
 * `fetchTeamDoraMetrics` dispatch needs, built in exactly one place.
 *
 * There are four call sites (the DORA body's own effect, the page refresh
 * callback, and the two settings dialogs that refetch after saving), and they
 * had each hand-rolled this object. When the contributor filter was added only
 * one of them learned about it, so any refetch triggered by a repo finishing
 * its sync, or by saving a production-branch/incident-PR setting, silently
 * dropped the selection: Lead Time and Deployment Frequency reverted to
 * team-wide while the dropdown still showed the chip and the cards still read
 * "authored by alice".
 *
 * Branch arguments stay with the caller on purpose -- the body and the refresh
 * callback send `useBranchesForPrFilters()` (branches *and* branch_mode) while
 * the two dialogs send only `branches`, and unifying that would change what
 * unfiltered dashboards request.
 */
export const useDoraMetricsFetchArgs = () => {
  const { orgId } = useAuth();
  const { singleTeamId, dates } = useSingleTeamConfig();
  const authors = useSelectedContributors();

  return useMemo(
    () => ({
      orgId,
      teamId: singleTeamId,
      fromDate: dates.start,
      toDate: dates.end,
      authors
    }),
    [orgId, singleTeamId, dates.start, dates.end, authors]
  );
};
