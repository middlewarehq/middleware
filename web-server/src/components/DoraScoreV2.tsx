import { KeyboardArrowDown } from '@mui/icons-material';
import { useTheme, Menu, Divider } from '@mui/material';
import { FC, MouseEventHandler, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { commonProps } from '@/content/DoraMetrics/MetricsCommonProps';
import { useBoolState, useEasyState } from '@/hooks/useEasyState';
import { appSlice } from '@/slices/app';
import { useSelector } from '@/store';
import { Industries, IndustryStandardsDoraScores } from '@/utils/dora';
import { depFn } from '@/utils/fn';

import { DoraScoreProps } from './DoraScore';
import { FlexBox } from './FlexBox';
import { Line } from './Text';

export const DoraScoreV2: FC<DoraScoreProps> = ({ ...stats }) => {
  const { selectedIndustry } = useSelectedIndustry();

  const standardScore = useMemo(() => {
    return IndustryStandardsDoraScores[selectedIndustry];
  }, [selectedIndustry]);

  return (
    <FlexBox>
      <FlexBox centered gap={1.5}>
        <FlexBox col>
          <Line bigish bold white>
            Your DORA
          </Line>
          <Line bigish bold white>
            Performance
          </Line>
        </FlexBox>

        <FlexBox col height={'50px'} centered gap={'14px'} ml={1}>
          <DoraScore stat={stats.avg} />
        </FlexBox>

        <FlexBox col ml={4}>
          <Line bigish bold white>
            Industry
          </Line>
          <Line bigish bold white>
            Standard
          </Line>
        </FlexBox>

        <DoraScore stat={standardScore} isIndustry />

        <FlexBox col>
          <Line bigish medium>
            {selectedIndustry}
          </Line>
          <IndustryDropdown />
        </FlexBox>
      </FlexBox>
    </FlexBox>
  );
};

export const DoraScore: FC<{ stat: number; isIndustry?: boolean }> = ({
  stat,
  isIndustry
}) => {
  const theme = useTheme();
  return (
    <FlexBox
      corner={theme.spacing(1)}
      px={1.5}
      sx={{
        background: isIndustry ? purpleBg : null,
        backgroundColor: !isIndustry && getBg(stat)
      }}
    >
      <Line fontSize={'2.4em'} bold white>
        {stat}{' '}
        <Line fontSize="0.8rem" ml="-4px">
          / 10
        </Line>
      </Line>
    </FlexBox>
  );
};

const purpleBg = `linear-gradient(30deg,#8C7CF0, #3E2EA4)`;

const getBg = (stat: number) => ({
  background:
    stat >= 8
      ? commonProps.elite.bg
      : stat >= 6
      ? commonProps.high.bg
      : stat >= 4
      ? commonProps.medium.bg
      : commonProps.low.bg
});

const IndustryDropdown = () => {
  const anchorEl = useEasyState();
  const cancelMenu = useBoolState(false);
  const { selectedIndustry, updateSelectedIndustry } = useSelectedIndustry();

  const handleOpenMenu: MouseEventHandler<HTMLDivElement> = (event) => {
    anchorEl.set(event.currentTarget);
  };

  const handleCloseMenu = useCallback(() => {
    depFn(anchorEl.set, null);
  }, [anchorEl.set]);

  return (
    <FlexBox>
      <FlexBox alignCenter pointer onClick={handleOpenMenu}>
        <Line primary>Change</Line>
        <KeyboardArrowDown color="primary" fontSize="small" />
      </FlexBox>

      <Menu
        id="team-setting-menu"
        anchorEl={anchorEl.value}
        keepMounted
        open={Boolean(anchorEl.value)}
        onClose={() => {
          handleCloseMenu();
          cancelMenu.false();
        }}
        MenuListProps={{
          'aria-labelledby': 'simple-menu',
          disablePadding: true,
          sx: {
            padding: 0
          }
        }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <FlexBox col gap1>
          <Line big semibold px={1}>
            Choose Industry
          </Line>
          <Divider />
          <FlexBox width={'300px'} col gap={1 / 2}>
            {Object.entries(Industries).map(
              ([key, industryName]) =>
                industryName !== Industries.OTHER && (
                  <FlexBox
                    onClick={() => {
                      updateSelectedIndustry(industryName as Industries);
                      handleCloseMenu();
                      cancelMenu.false();
                    }}
                    key={key}
                    p={1 / 2}
                    px={1}
                    pointer
                    bgcolor={
                      industryName === selectedIndustry ? 'primary.light' : null
                    }
                    sx={{
                      transition: 'background-color 0.2s',
                      ':hover': {
                        bgcolor: 'primary.dark'
                      }
                    }}
                  >
                    <Line regular>{industryName}</Line>
                  </FlexBox>
                )
            )}
          </FlexBox>
        </FlexBox>
      </Menu>
    </FlexBox>
  );
};

export const useSelectedIndustry = () => {
  const selectedIndustry = useSelector((s) => s.app.selectedIndustry);
  const dispatch = useDispatch();

  const updateSelectedIndustry = useCallback(
    (industry: Industries) => {
      dispatch(appSlice.actions.setIndustry(industry));
    },
    [dispatch]
  );

  return useMemo(
    () => ({
      selectedIndustry: selectedIndustry
        ? selectedIndustry
        : Industries.ALL_INDUSTRIES,
      updateSelectedIndustry
    }),
    [selectedIndustry, updateSelectedIndustry]
  );
};
