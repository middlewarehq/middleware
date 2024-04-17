import { useRouter } from 'next/router';

import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import {
  useSingleTeamConfig,
  useStateBranchConfig
} from '@/hooks/useStateTeamConfig';
import { fetchTeamDoraMetrics } from '@/slices/dora_metrics';
import { useDispatch, useSelector } from '@/store';
import { ActiveBranchMode } from '@/types/resources';

export const usePageRefreshCallback = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { orgId } = useAuth();
  const { dates, singleTeamId } = useSingleTeamConfig();
  const activeBranchMode = useSelector((s) => s.app.branchMode);

  const branches = useStateBranchConfig();
  switch (router.pathname) {
    case ROUTES.DORA_METRICS.PATH:
      return () =>
        dispatch(
          fetchTeamDoraMetrics({
            orgId,
            teamId: singleTeamId,
            fromDate: dates.start,
            toDate: dates.end,
            branches:
              activeBranchMode === ActiveBranchMode.PROD
                ? null
                : activeBranchMode === ActiveBranchMode.ALL
                ? '^'
                : branches
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
