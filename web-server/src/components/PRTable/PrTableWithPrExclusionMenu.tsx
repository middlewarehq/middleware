import { Button, Divider } from '@mui/material';
import { useRouter } from 'next/router';
import { FC, useMemo, useCallback, useEffect } from 'react';

import { PullRequestsTableHeadProps } from '@/components/PRTable/PullRequestsTableHead';
import { useModal } from '@/contexts/ModalContext';
import { useAuth } from '@/hooks/useAuth';
import { useEasyState } from '@/hooks/useEasyState';
import { useFeature } from '@/hooks/useFeature';
import { useSingleTeamConfig } from '@/hooks/useStateTeamConfig';
import { updateExcludedPrs, fetchExcludedPrs } from '@/slices/team';
import { useDispatch, useSelector } from '@/store';
import { PR } from '@/types/resources';

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
        userId,
        teamId,
        excludedPrs: [...excludedPrs, ...selectedPrs]
      })
    ).then(() => onUpdateCallback());
  }, [
    dispatch,
    excludedPrs,
    onUpdateCallback,
    propPrs,
    selectedPrIds.value,
    teamId,
    userId
  ]);

  const isUserRoute = router.pathname.includes('/user');
  const isPrExclusionEnabled = useFeature('enable_pr_exclusion');
  const enablePrSelection = useMemo(
    () => !isUserRoute && isPrExclusionEnabled,
    [isPrExclusionEnabled, isUserRoute]
  );

  useEffect(() => {
    dispatch(fetchExcludedPrs({ teamId }));
  }, [dispatch, userId, teamId]);

  return (
    <PullRequestsTable
      propPrs={propPrs}
      selectionMenu={
        enablePrSelection && (
          <FlexBox>
            {Boolean(selectedPrIds.value.length) && (
              <Button
                sx={{ p: 1.5 }}
                variant="outlined"
                disabled={!selectedPrIds.value.length}
                onClick={updateExcludedPrsHandler}
              >
                Exclude From Team Analytics
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
  const { userId } = useAuth();
  const teamId = useSingleTeamConfig().singleTeamId;

  const excludedPrs = useSelector((s) => s.team.excludedPrs);
  const selectedPrIds = useEasyState<ID[]>([]);

  const updateExcludedPrsHandler = useCallback(() => {
    const selectedPrIdsSet = new Set(selectedPrIds.value);
    const filteredPrs = excludedPrs.filter((p) => !selectedPrIdsSet.has(p.id));
    dispatch(
      updateExcludedPrs({
        userId,
        teamId,
        excludedPrs: [...filteredPrs]
      })
    ).then(() => onUpdateCallback());
  }, [
    dispatch,
    excludedPrs,
    onUpdateCallback,
    selectedPrIds.value,
    teamId,
    userId
  ]);

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
