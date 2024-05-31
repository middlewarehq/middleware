import { useRouter } from 'next/router';

import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import {
  useBranchesForPrFilters,
  useSingleTeamConfig
} from '@/hooks/useStateTeamConfig';
import { fetchTeamDoraMetrics } from '@/slices/dora_metrics';
import { useDispatch } from '@/store';

export const usePageRefreshCallback = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { orgId } = useAuth();
  const { dates, singleTeamId } = useSingleTeamConfig();
  const branchPayloadForPrFilters = useBranchesForPrFilters();

  switch (router.pathname) {
    case ROUTES.DORA_METRICS.PATH:
      return () =>
        dispatch(
          fetchTeamDoraMetrics({
            orgId,
            teamId: singleTeamId,
            fromDate: dates.start,
            toDate: dates.end,
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
