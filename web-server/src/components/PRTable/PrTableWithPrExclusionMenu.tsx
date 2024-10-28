import { Button, Divider } from '@mui/material';
import { useRouter } from 'next/router';
import { FC, useCallback, useEffect } from 'react';

import { PullRequestsTableHeadProps } from '@/components/PRTable/PullRequestsTableHead';
import { useModal } from '@/contexts/ModalContext';
import { useAuth } from '@/hooks/useAuth';
import { useEasyState } from '@/hooks/useEasyState';
import { useSingleTeamConfig } from '@/hooks/useStateTeamConfig';
import { updateExcludedPrs, fetchExcludedPrs } from '@/slices/team';
import { useDispatch, useSelector } from '@/store';
import { PR } from '@/types/resources';
import { depFn } from '@/utils/fn';

import { PullRequestsTable } from './PullRequestsTable';

import { FlexBox } from '../FlexBox';
import { Line } from '../Text';

export const PrTableWithPrExclusionMenu: FC<
  { propPrs: PR[]; onUpdateCallback: () => void } & Omit<
    PullRequestsTableHeadProps,
    'conf' | 'updateSortConf' | 'count'
  >
> = ({ propPrs, onUpdateCallback }) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { userId } = useAuth();
  const { addModal } = useModal();

  const teamId = useSingleTeamConfig().singleTeamId;
  const selectedPrIds = useEasyState<ID[]>([]);

  const excludedPrs = useSelector((s) => s.team.excludedPrs);

  const updateExcludedPrsHandler = useCallback(() => {
    const selectedPrIdsSet = new Set(selectedPrIds.value);
    const selectedPrs = propPrs.filter((pr) => selectedPrIdsSet.has(pr.id));

    dispatch(
      updateExcludedPrs({
        teamId,
        excludedPrs: [...excludedPrs, ...selectedPrs]
      })
    ).then(() => {
      onUpdateCallback();
      depFn(selectedPrIds.reset);
    });
  }, [
    dispatch,
    excludedPrs,
    onUpdateCallback,
    propPrs,
    selectedPrIds.reset,
    selectedPrIds.value,
    teamId
  ]);

  const isUserRoute = router.pathname.includes('/user');
  const enablePrSelection = !isUserRoute;

  useEffect(() => {
    dispatch(fetchExcludedPrs({ teamId }));
  }, [dispatch, userId, teamId]);

  return (
    <PullRequestsTable
      propPrs={propPrs}
      selectionMenu={
        enablePrSelection && (
          <FlexBox gap1>
            {Boolean(selectedPrIds.value.length) && (
              <Button
                sx={{ p: 1.5 }}
                variant="outlined"
                disabled={!selectedPrIds.value.length}
                onClick={updateExcludedPrsHandler}
              >
                Exclude For Team
              </Button>
            )}
            {Boolean(excludedPrs?.length) &&
              !Boolean(selectedPrIds.value.length) && (
                <Button
                  sx={{ p: 1.5 }}
                  variant="outlined"
                  onClick={() => {
                    addModal({
                      title: 'PRs Excluded From Team Analytics',
                      body: (
                        <ExcludedPrTable onUpdateCallback={onUpdateCallback} />
                      )
                    });
                  }}
                >
                  Show Excluded PRs
                </Button>
              )}
          </FlexBox>
        )
      }
      selectedPrIds={selectedPrIds}
      isPrSelectionEnabled={enablePrSelection}
    />
  );
};

export const ExcludedPrTable: FC<{
  onUpdateCallback: () => void;
}> = ({ onUpdateCallback }) => {
  const dispatch = useDispatch();
  const teamId = useSingleTeamConfig().singleTeamId;

  const excludedPrs = useSelector((s) => s.team.excludedPrs);
  const selectedPrIds = useEasyState<ID[]>([]);

  const updateExcludedPrsHandler = useCallback(() => {
    const selectedPrIdsSet = new Set(selectedPrIds.value);
    const filteredPrs = excludedPrs.filter((p) => !selectedPrIdsSet.has(p.id));
    dispatch(
      updateExcludedPrs({
        teamId,
        excludedPrs: [...filteredPrs]
      })
    ).then(() => onUpdateCallback());
  }, [dispatch, excludedPrs, onUpdateCallback, selectedPrIds.value, teamId]);

  return (
    <FlexBox col gap1>
      <Divider />
      {excludedPrs.length ? (
        <PullRequestsTable
          propPrs={excludedPrs}
          selectionMenu={
            <FlexBox>
              <Button
                sx={{
                  p: 1.5,
                  '&.Mui-disabled': {
                    borderColor: 'secondary.light'
                  }
                }}
                variant="outlined"
                disabled={!selectedPrIds.value.length}
                onClick={updateExcludedPrsHandler}
              >
                Include Back to Team Analytics
              </Button>
            </FlexBox>
          }
          selectedPrIds={selectedPrIds}
          isPrSelectionEnabled={true}
        />
      ) : (
        <Line big bold>
          No excluded PRs
        </Line>
      )}
    </FlexBox>
  );
};
