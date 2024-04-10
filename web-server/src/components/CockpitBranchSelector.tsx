import {
  KeyboardArrowDownRounded,
  RadioButtonUncheckedRounded
} from '@mui/icons-material';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import {
  Box,
  Divider,
  Popover,
  Typography,
  useTheme,
  alpha
} from '@mui/material';
import { FC, useRef } from 'react';

import GitBranch from '@/assets/git-merge-line.svg';
import { useBoolState } from '@/hooks/useEasyState';
import { appSlice } from '@/slices/app';
import { useDispatch, useSelector } from '@/store';
import { brandColors } from '@/theme/schemes/theme';
import { ActiveBranchMode, CockpitBranchMode } from '@/types/resources';

import { HeaderBtn } from './HeaderBtn';
import { LightTooltip } from './Shared';

export const CockpitBranchSelector: FC = () => {
  const theme = useTheme();
  const elRef = useRef(null);
  const open = useBoolState(false);
  const dispatch = useDispatch();
  const mode = useSelector((state) => state.app.cockpitBranchMode);

  const isAllMode = mode === CockpitBranchMode.ALL;
  const isProdMode = mode === CockpitBranchMode.PROD;

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
            isAllMode
              ? 'Data will be fetched for all branches of each team repo'
              : 'Data will be fetched for all production branches of each team repo'
          }
        >
          <Typography
            fontWeight="bold"
            color={
              brandColors.branch[
                (isAllMode || isProdMode
                  ? ActiveBranchMode.ALL.toLowerCase()
                  : ActiveBranchMode.CUSTOM.toLowerCase()) as keyof typeof brandColors.branch
              ]
            }
            fontSize="small"
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
          >
            {isAllMode ? 'All Branches' : 'Production Branches'}
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
              selected={isProdMode}
              onSelect={() =>
                dispatch(
                  appSlice.actions.setCockpitBranchMode({
                    mode: CockpitBranchMode.PROD
                  })
                )
              }
            >
              Production Branches
            </OptionTitle>
            <Box fontSize="smaller" sx={{ userSelect: 'none' }}>
              By selecting this, you’ll see metrics from production branches of
              all repos associated with the team
            </Box>
          </Option>
          <Divider sx={{ my: -1 / 2 }} />
          <Option>
            <OptionTitle
              selected={isAllMode}
              onSelect={() =>
                dispatch(
                  appSlice.actions.setCockpitBranchMode({
                    mode: CockpitBranchMode.ALL
                  })
                )
              }
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
