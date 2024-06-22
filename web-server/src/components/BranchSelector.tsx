import {
  CheckCircleOutlineRounded,
  KeyboardArrowDownRounded,
  RadioButtonUncheckedRounded
} from '@mui/icons-material';
import {
  Typography,
  Box,
  alpha,
  Divider,
  useTheme,
  Popover
} from '@mui/material';
import { useSnackbar } from 'notistack';
import pluralize from 'pluralize';
import { trim } from 'ramda';
import { FC, useCallback, useRef } from 'react';

import GitBranch from '@/assets/git-merge-line.svg';
import { HeaderBtn } from '@/components/HeaderBtn';
import { LightTooltip } from '@/components/Shared';
import { TeamProductionBranchSelector } from '@/components/TeamProductionBranchSelector';
import { useModal } from '@/contexts/ModalContext';
import { useBoolState, useEasyState } from '@/hooks/useEasyState';
import { useStateTeamConfig } from '@/hooks/useStateTeamConfig';
import { appSlice } from '@/slices/app';
import { useDispatch, useSelector } from '@/store';
import { brandColors } from '@/theme/schemes/theme';
import { ActiveBranchMode } from '@/types/resources';
import { depFn } from '@/utils/fn';

import { ChipInput } from './ChipInput';
import { MiniButton } from './MiniButton';
import { Line } from './Text';

export const BranchSelector: FC = () => {
  const theme = useTheme();
  const elRef = useRef(null);
  const open = useBoolState(false);
  const dispatch = useDispatch();
  const { addModal, closeModal } = useModal();
  const { singleTeamId } = useStateTeamConfig();
  const [mode, names] = useSelector((state) => [
    state.app.branchMode,
    state.app.branchNames.split(',').map((name) => name.replace(/^\^/, ''))
  ]);
  const teamReposProdBranchArray = useSelector(
    (state) => state.app.teamsProdBranchMap?.[singleTeamId]
  );

  const { enqueueSnackbar } = useSnackbar();
  const isAllMode = mode === ActiveBranchMode.ALL;
  const isProdMode = mode === ActiveBranchMode.PROD;

  const localBranchNames = useEasyState<string[]>(
    isAllMode || isProdMode ? [] : [...names]
  );

  const updateStateBranchNames = useCallback(
    (values: string[]) => {
      dispatch(
        appSlice.actions.setBranchState({
          mode: ActiveBranchMode.CUSTOM,
          names: values.map(trim).join(',')
        })
      );
    },
    [dispatch]
  );

  const setProdStateBranchNames = useCallback(() => {
    dispatch(
      appSlice.actions.setBranchState({
        mode: ActiveBranchMode.PROD,
        names:
          teamReposProdBranchArray
            ?.map((r) => r.prod_branches)
            .filter(Boolean)
            .join(',') || ''
      })
    );
    depFn(localBranchNames.set, []);
  }, [dispatch, teamReposProdBranchArray,localBranchNames.set]);

  const openProductionBranchSelectorModal = useCallback(async () => {
    const modal = addModal({
      title: `Set default production branches`,
      body: (
        <TeamProductionBranchSelector onClose={() => closeModal(modal.key)} />
      ),
      showCloseIcon: true
    });
  }, [addModal, closeModal]);

  const handleBranchNamesInput = useCallback(
    (values: string[]) => {
      const lastValue = values[values.length - 1];
      let isValid = true;

      try {
        new RegExp(lastValue);
      } catch (_) {
        isValid = false;
      }

      const trimmedValues = values.map((name) => name.replace(/^\^/, ''));
      if (isValid) depFn(localBranchNames.set, trimmedValues);
      else depFn(localBranchNames.set, trimmedValues.slice(0, -1));
    },
    [localBranchNames.set]
  );

  return (
    <Box>
      <HeaderBtn
        ref={elRef}
        startIcon={
          <GitBranch height={theme.spacing(2)} width={theme.spacing(2)} />
        }
        endIcon={<KeyboardArrowDownRounded />}
        onClick={open.true}
        sx={{
          width: '280px',
          '> .MuiButton-endIcon': { marginLeft: 'auto' },
          ':hover > .MuiTypography-root': {
            color: theme.palette.getContrastText(theme.colors.secondary.main)
          }
        }}
      >
        <Box mr={1 / 2}>Branch:</Box>
        <LightTooltip
          arrow
          title={
            isAllMode ? (
              'Data will be fetched for all branches of each team repo'
            ) : isProdMode ? (
              'Data will be fetched for all production branches of each team repo'
            ) : (
              <Box>
                <Box>
                  {names.length} {pluralize('branch', names.length)} selected
                </Box>
                <Box>{names.join(', ')}</Box>
              </Box>
            )
          }
        >
          <Typography
            fontWeight="bold"
            color={
              brandColors.branch[
                isAllMode || isProdMode
                  ? (ActiveBranchMode.ALL.toLowerCase() as keyof typeof brandColors.branch)
                  : (ActiveBranchMode.CUSTOM.toLowerCase() as keyof typeof brandColors.branch)
              ]
            }
            fontSize="small"
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
          >
            {isAllMode
              ? 'All Branches'
              : isProdMode
              ? 'Production Branches'
              : names.join(', ')}
          </Typography>
        </LightTooltip>
      </HeaderBtn>
      <Popover anchorEl={elRef.current} onClose={open.false} open={open.value}>
        <Box
          sx={{
            p: 2,
            background: alpha(theme.colors.alpha.black[100], 0.06),
            width: '320px'
          }}
          display="flex"
          flexDirection="column"
          gap={2}
        >
          <Option>
            <OptionTitle
              selected={!isAllMode && !isProdMode}
              onSelect={() => {
                if (!localBranchNames.value.length) {
                  return enqueueSnackbar(
                    'You need to specify at least one branch to be able to select that.',
                    { variant: 'warning', autoHideDuration: 5000 }
                  );
                }
                updateStateBranchNames(localBranchNames.value);
                dispatch(
                  appSlice.actions.setBranchMode(ActiveBranchMode.CUSTOM)
                );
              }}
            >
              Use custom branch(es)
            </OptionTitle>

            <ChipInput
              placeholder="Branch names"
              values={localBranchNames.value}
              onChange={handleBranchNamesInput}
              onSubmit={updateStateBranchNames}
            />

            <Box
              fontSize="smaller"
              sx={{ userSelect: 'none' }}
              display="flex"
              flexDirection="column"
              gap={1}
            >
              <Box color="secondary.dark">
                Type comma-separated branch names and hit Enter.{' '}
                <Line bold color="info.dark">
                  Regex supported.
                </Line>
              </Box>
              <Box>
                By selecting this, you'll see metrics of these branches for all
                repos associated with this team.
              </Box>
              <Box>
                If any of the repos don't have any of these branches, you'll see
                no data for those repos.
              </Box>
            </Box>
          </Option>
          <Divider sx={{ my: -1 / 2 }} />
          <Option>
            <OptionTitle
              selected={isProdMode}
              onSelect={setProdStateBranchNames}
            >
              Production Branches
            </OptionTitle>
            <Box fontSize="smaller" sx={{ userSelect: 'none' }}>
              By selecting this, you’ll see metrics from production branches of
              all repos associated with the team
            </Box>
            <MiniButton
              onClick={openProductionBranchSelectorModal}
              color={'primary'}
              variant="outlined"
              sx={{ width: 'fit-content' }}
            >
              {teamReposProdBranchArray?.length
                ? `View/Edit Branches ->`
                : `No repos. Click to assign ->`}
            </MiniButton>
          </Option>
          <Divider sx={{ my: -1 / 2 }} />
          <Option>
            <OptionTitle
              selected={isAllMode}
              onSelect={() => {
                dispatch(
                  appSlice.actions.setBranchState({
                    mode: ActiveBranchMode.ALL,
                    names: ''
                  })
                );
                depFn(localBranchNames.set, []);
              }}
            >
              All Branches
            </OptionTitle>
            <Box fontSize="smaller" sx={{ userSelect: 'none' }}>
              By selecting this, you’ll see metrics from all branches of all
              repos associated with the team
            </Box>
          </Option>
        </Box>
      </Popover>
    </Box>
  );
};
const OptionTitle: FC<{ selected: boolean; onSelect: () => any }> = ({
  selected,
  children,
  onSelect
}) => (
  <Typography
    variant="h4"
    sx={{ userSelect: 'none', display: 'flex', alignItems: 'center', gap: 1 }}
    onClick={onSelect}
  >
    <Box>{children}</Box>
    {selected ? (
      <CheckCircleOutlineRounded fontSize="small" color="success" />
    ) : (
      <RadioButtonUncheckedRounded fontSize="small" color="secondary" />
    )}
  </Typography>
);
const Option: FC = ({ children }) => {
  const theme = useTheme();
  return (
    <Box
      display="flex"
      flexDirection="column"
      gap={1}
      m={-1}
      p={1}
      borderRadius={1 / 2}
      sx={{
        ':hover': { backgroundColor: theme.colors.secondary.lighter }
      }}
    >
      {children}
    </Box>
  );
};
