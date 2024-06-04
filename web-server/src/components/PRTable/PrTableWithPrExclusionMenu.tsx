import { FC, useEffect } from 'react';

import { PullRequestsTableHeadProps } from '@/components/PRTable/PullRequestsTableHead';
import { useEasyState } from '@/hooks/useEasyState';
import { useSingleTeamConfig } from '@/hooks/useStateTeamConfig';
import { fetchExcludedPrs } from '@/slices/team';
import { useDispatch } from '@/store';
import { PR } from '@/types/resources';

import { PullRequestsTable } from './PullRequestsTable';

export const PrTableWithPrExclusionMenu: FC<
  { propPrs: PR[]; onUpdateCallback: () => void } & Omit<
    PullRequestsTableHeadProps,
    'conf' | 'updateSortConf' | 'count'
  >
> = ({ propPrs }) => {
  const dispatch = useDispatch();

  const teamId = useSingleTeamConfig().singleTeamId;
  const selectedPrIds = useEasyState<ID[]>([]);

  useEffect(() => {
    dispatch(fetchExcludedPrs({ teamId }));
  }, [dispatch, teamId]);

  return <PullRequestsTable propPrs={propPrs} selectedPrIds={selectedPrIds} />;
};
