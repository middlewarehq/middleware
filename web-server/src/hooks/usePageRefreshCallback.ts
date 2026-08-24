import { useRouter } from 'next/router';

import { ROUTES } from '@/constants/routes';
// CLUSTOX: contributor filter -- the refetch this callback triggers (a repo
// finishing its sync) must keep the selection, so the arguments come from the
// shared hook instead of being rebuilt here.
import { useDoraMetricsFetchArgs } from '@/hooks/useDoraMetricsFetchArgs';
import { useBranchesForPrFilters } from '@/hooks/useStateTeamConfig';
import { fetchTeamDoraMetrics } from '@/slices/dora_metrics';
import { useDispatch } from '@/store';

export const usePageRefreshCallback = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const doraMetricsFetchArgs = useDoraMetricsFetchArgs();
  const branchPayloadForPrFilters = useBranchesForPrFilters();

  switch (router.pathname) {
    case ROUTES.DORA_METRICS.PATH:
      return () =>
        dispatch(
          fetchTeamDoraMetrics({
            ...doraMetricsFetchArgs,
            ...branchPayloadForPrFilters
          })
        );
    default:
      return () => {};
  }
  //   TODO: Pending routes to implement
  // ROUTES.PROJECT_MANAGEMENT.PATH
  // ROUTES.COLLABORATE.METRICS.PATH
  // ROUTES.COLLABORATE.METRICS.USER.PATH
  // ROUTES.COLLABORATE.METRICS.CODEBASE.PATH
};
