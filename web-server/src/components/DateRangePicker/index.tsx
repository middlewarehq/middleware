import { ArrowBackIosRounded, InfoOutlined } from '@mui/icons-material';
import { useTheme, Button, alpha, Divider } from '@mui/material';
import { StaticDateRangePicker } from '@mui/x-date-pickers-pro';
import { differenceInDays, isValid } from 'date-fns';
import pluralize from 'pluralize';
import { equals, groupBy, values } from 'ramda';
import { FC, Fragment, useCallback, useMemo, useRef, useState } from 'react';

import { track } from '@/constants/events';
import { useActiveRouteEvent } from '@/hooks/useActiveRouteEvent';
import { useBoolState, useEasyState } from '@/hooks/useEasyState';
import { useSelector } from '@/store';
import { depFn } from '@/utils/fn';

import {
  QuickRangeOptions,
  presetOptions,
  DateRangeLogic,
  DATE_RANGE_MAX_DIFF
} from './utils';

import { FlexBox } from '../FlexBox';
import { Line } from '../Text';
import { SubHeader } from '../WrapperComponents';

export type DateRange = [Date | null, Date | null];
export type DateRangeMap = { start?: Date; end?: Date };
export type SetDateRange = (
  dateRange: DateRange,
  dateMode: QuickRangeOptions,
  onUpdate?: () => void
) => void;

const categories = ['By days', 'By months', 'By quarters'] as const;

export const DateRangePicker: FC<{
  range: DateRange;
  setRange: SetDateRange;
  onClose: () => void;
}> = ({ range, setRange, onClose }) => {
  const localRangeSelection = useEasyState<DateRange>(range);
  const activeRouteEvent = useActiveRouteEvent('APP_DATE_RANGE_CHANGED');
  const dateMode = useSelector((s) => s.app.dateMode);
  const numDays = useMemo(
    () =>
      localRangeSelection.value.every(isValid) &&
      differenceInDays(
        localRangeSelection.value[1],
        localRangeSelection.value[0]
      ) + 1,
    [localRangeSelection.value]
  );
  const [quickOpt, setQuickOpt] = useState<QuickRangeOptions>(dateMode);
  const today = useMemo(() => new Date(), []);
  const rangePosition = useEasyState<'start' | 'end'>('start');

  const pickerClosedRef = useRef(false);

  const applyRangeChange = useCallback(() => {
    requestAnimationFrame(() => {
      if (pickerClosedRef.current) {
        pickerClosedRef.current = false;
        return;
      }
      track('APPLIED_DATE_RANGE', {
        mode: 'custom'
      });
      // @ts-ignore
      setRange(localRangeSelection.value, 'custom', (newRange: DateRange) => {
        depFn(localRangeSelection.set, newRange);
        setQuickOpt('custom');
      });
    });
  }, [localRangeSelection.set, localRangeSelection.value, setRange]);

  const handlePresetChange = useCallback(
    (option: QuickRangeOptions) => {
      if (option === 'custom') return;
      setRange(DateRangeLogic[option]?.(), option);
      depFn(localRangeSelection.set, DateRangeLogic[option]?.());
      setQuickOpt(option);
      track(activeRouteEvent, {
        mode: option
      });
      setTimeout(onClose, 500);
    },
    [activeRouteEvent, localRangeSelection.set, onClose, setRange]
  );

  const handleRangeChange = useCallback(
    (newRange) => {
      requestAnimationFrame(() => {
        if (pickerClosedRef.current) {
          pickerClosedRef.current = false;
          return;
        }
        track(activeRouteEvent, {
          mode: 'custom'
        });
        depFn(localRangeSelection.set, newRange);
      });
    },
    [activeRouteEvent, localRangeSelection.set]
  );

  const isSaveDisabled = useMemo(
    () =>
      equals(localRangeSelection.value, range) ||
      !localRangeSelection.value.every(Boolean),
    [localRangeSelection.value, range]
  );

  return (
    <FlexBox>
      <FlexBox width={'180px'}>
        <Presets
          key={quickOpt}
          quickOpt={quickOpt}
          handlePresetChange={handlePresetChange}
        />
      </FlexBox>
      <Divider orientation="vertical" flexItem />
      <FlexBox col mx={1} mt={1}>
        <FlexBox
          relative
          col
          p={1 / 2}
          m={1}
          bgcolor={
            rangePosition.value === 'end' ? 'info.light' : 'primary.light'
          }
          sx={{
            transition: 'all 0.2s ease-in-out'
          }}
          borderRadius={'16px'}
        >
          <TabSelector rangePosition={rangePosition.value} colors="light" />
          <CalendarPicker
            handleRangeChange={handleRangeChange}
            range={localRangeSelection.value}
            rangePosition={rangePosition.value}
            rangePositionSet={rangePosition.set}
            today={today}
          />
          <DateDistance numDays={numDays} />
        </FlexBox>
        <SubmitButtons
          isSaveDisabled={isSaveDisabled}
          onCancel={onClose}
          onSave={applyRangeChange}
        />
      </FlexBox>
    </FlexBox>
  );
};

const Presets = ({
  quickOpt,
  handlePresetChange
}: {
  quickOpt: QuickRangeOptions;
  handlePresetChange: (option: QuickRangeOptions) => void;
}) => {
  const presetGroups = useMemo(
    () => values(groupBy((opt) => opt.type, presetOptions)),
    []
  );

  const categorizedGroups = useMemo(() => {
    return presetGroups.map((group, i) => ({
      category: categories[i],
      group
    }));
  }, [presetGroups]);

  return (
    <FlexBox col gap1 height={'520px'} overflow={'auto'} pt={2.5} fullWidth>
      <FlexBox col>
        {quickOpt === 'custom' && <CustomOption />}
        {categorizedGroups.map(({ category, group }, i) => (
          <Accordion
            key={i}
            category={category}
            group={group}
            rank={i}
            quickOpt={quickOpt}
            handlePresetChange={handlePresetChange}
          />
        ))}
      </FlexBox>
    </FlexBox>
  );
};
const Accordion = ({
  category,
  group,
  rank,
  quickOpt,
  handlePresetChange
}: {
  category: string;
  group: typeof presetOptions;
  rank: number;
  quickOpt: QuickRangeOptions;
  handlePresetChange: (option: QuickRangeOptions) => void;
}) => {
  const isContainingSelectedOption = useMemo(() => {
    if (quickOpt === 'custom') return false;
    return Boolean(group.find((item) => item.value === quickOpt));
  }, [group, quickOpt]);
  const expandedCategory = useBoolState(isContainingSelectedOption);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <Fragment>
      <FlexBox
        justifyBetween
        relative
        alignCenter
        mt={rank === 0 && quickOpt !== 'custom' ? -2 : 0}
        onClick={expandedCategory.toggle}
        pointer
      >
        <SubHeader
          medium
          sx={{
            px: 2,
            py: 3 / 2
          }}
        >
          {category}
        </SubHeader>
        <FlexBox width={'25px'} mr={1 / 2} centered>
          {isContainingSelectedOption ? (
            <FlexBox
              width={'8px'}
              height={'8px'}
              round
              bgcolor={'primary.dark'}
            />
          ) : (
            <ArrowBackIosRounded
              sx={{
                fontSize: '16px',
                transform: `rotate(${expandedCategory.value ? 90 : -90}deg)`,
                transition: 'all 0.2s ease-in-out'
              }}
            />
          )}
        </FlexBox>
      </FlexBox>
      <FlexBox
        col
        height={!expandedCategory.value ? '0px' : ref.current?.scrollHeight}
        overflow={'hidden'}
        sx={{
          transition: 'all 0.2s ease-in-out'
        }}
        ref={ref}
      >
        {group.map((option) => {
          if (option.value === 'custom') return null;
          return (
            <FlexBox
              px={2}
              py={1}
              key={option.value}
              onClick={() => handlePresetChange(option.value)}
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                ':hover': {
                  bgcolor: 'primary.light'
                }
              }}
              bgcolor={
                option.value === quickOpt ? 'primary.light' : 'transparent'
              }
            >
              <Line
                semibold={option.value === quickOpt}
                color={option.value === quickOpt ? 'white' : 'inherit'}
              >
                {option.label}
              </Line>
            </FlexBox>
          );
        })}
      </FlexBox>
    </Fragment>
  );
};

const DateDistance = ({ numDays }: { numDays: number }) => {
  const theme = useTheme();
  const correctedRange = DATE_RANGE_MAX_DIFF + 1;
  const isError = numDays > correctedRange;
  const color = isError ? alpha('#FF1843', 0.3) : '#323758';
  return (
    <FlexBox
      darkTip
      title={
        isError ? (
          <span>
            Max date range
            <span>
              <br />
            </span>
            can be {correctedRange} days
          </span>
        ) : (
          ''
        )
      }
      position={'absolute'}
      sx={{
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)'
      }}
      width={'300px'}
      justifyCenter
      alignCenter
      gap={1 / 5}
    >
      <FlexBox
        width={'8px'}
        height={'8px'}
        left={theme.spacing(1)}
        relative
        round
        bgcolor={color}
      />
      <FlexBox
        width={'60px'}
        relative
        sx={{
          borderTop: `solid 2px ${color}`
        }}
      />
      <FlexBox
        width={'20px'}
        relative
        sx={{
          borderTop: `dashed 2px ${color}`
        }}
      />
      <FlexBox
        bgcolor={color}
        py={1 / 3}
        px={1}
        sx={{
          borderRadius: '16px',
          zIndex: 2
        }}
        centered
        mx={1 / 2}
      >
        <Line
          tiny
          semibold
          sx={{
            textAlign: 'center',
            whiteSpace: 'nowrap'
          }}
        >
          {Number.isFinite(numDays)
            ? `${numDays} ${pluralize('day', numDays)}`
            : 'choose both dates'}
        </Line>
        {isError && (
          <InfoOutlined
            sx={{
              fontSize: '12px',
              ml: 1 / 2,
              color: '#fff'
            }}
          />
        )}
      </FlexBox>
      <FlexBox
        width={'20px'}
        relative
        sx={{
          borderTop: `dashed 2px ${color}`
        }}
      />
      <FlexBox
        width={'60px'}
        relative
        sx={{
          borderTop: `solid 2px ${color}`
        }}
      />
      <FlexBox
        width={'8px'}
        height={'8px'}
        right={theme.spacing(1)}
        relative
        round
        bgcolor={color}
      />
    </FlexBox>
  );
};

const TabSelector = ({
  rangePosition,
  colors
}: {
  rangePosition: 'start' | 'end';
  colors: 'dark' | 'main' | 'light';
}) => {
  const theme = useTheme();
  return (
    <FlexBox
      width={'110px'}
      left={rangePosition === 'start' ? '32px' : 'calc(100% - 142px)'}
      position={'absolute'}
      top={theme.spacing(1 / 2)}
      height={'58px'}
      bgcolor={
        rangePosition === 'start' ? 'primary.' + colors : 'info.' + colors
      }
      sx={{
        transition: 'all 0.2s ease-in-out',
        borderBottomLeftRadius: '16px',
        borderBottomRightRadius: '16px'
      }}
    />
  );
};

const CalendarPicker = ({
  rangePosition,
  rangePositionSet,
  handleRangeChange,
  range,
  today
}: {
  rangePosition: 'start' | 'end';
  rangePositionSet: (e: any) => void;
  handleRangeChange: (newRange: any) => void;
  range: DateRange;
  today: Date;
}) => {
  return (
    <StaticDateRangePicker
      calendars={2}
      disableAutoMonthSwitching
      value={range}
      onChange={handleRangeChange}
      maxDate={today}
      onRangePositionChange={rangePositionSet}
      sx={{
        borderRadius: '10px',
        '.MuiDateRangePickerToolbar-container': {
          mt: -1,
          mb: -1
        },
        '.MuiDateRangePickerDay-notSelectedDate': {
          ':hover': {
            bgcolor: rangePosition === 'end' ? 'info.light' : 'primary.light'
          }
        },
        '.MuiDateRangePickerDay-rangeIntervalDayHighlightStart': {
          '.Mui-selected': {
            bgcolor:
              rangePosition === 'start' ? 'primary.main' : 'primary.light',
            ':hover': {
              bgcolor:
                rangePosition === 'start' ? 'primary.dark' : 'primary.main'
            }
          }
        },
        '.MuiDateRangeCalendar-root': {
          marginTop: '8px'
        },
        '.MuiDateRangePickerDay-rangeIntervalDayHighlightEnd': {
          '.Mui-selected': {
            bgcolor:
              rangePosition === 'end' ? 'info.main' : '#244e76 !important',
            ':hover': {
              bgcolor: rangePosition === 'end' ? 'info.dark' : 'info.main'
            }
          }
        }
      }}
      slots={{
        actionBar: () => null
      }}
      slotProps={{
        toolbar: {
          sx: {
            '.MuiTypography-root': {
              display: 'none'
            },
            '.MuiButtonBase-root': {
              '>.MuiTypography-root': {
                display: 'inline-block'
              }
            },
            '.MuiTypography-overline': {
              display: 'none'
            },
            '.MuiDateRangePickerToolbar-container': {
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              justifyContent: 'space-between',
              '> .MuiButtonBase-root': {
                borderRadius: '16px',
                overflow: 'hidden',
                bgcolor: 'transparent'
              },
              '> .MuiTypography-root': {
                px: 1,
                fontWeight: '900'
              }
            },
            '.MuiButton-root > span': {
              px: 1.5,
              py: 1 / 2,
              fontSize: '1.4em',
              bgcolor: '#fff1',
              color: 'white',
              width: '110px',
              textAlign: 'center',
              transition: 'all 0.2s ease-in-out'
            },
            'span.Mui-selected': {
              fontWeight: 800,
              color: 'white',
              bgcolor: 'transparent',
              width: '110px',
              textAlign: 'center',
              transition: 'all 0.2s ease-in-out'
            }
          }
        }
      }}
    />
  );
};

const SubmitButtons = ({
  onSave,
  onCancel,
  isSaveDisabled
}: {
  onSave: () => void;
  onCancel: () => void;
  isSaveDisabled: boolean;
}) => {
  return (
    <FlexBox fullWidth gap1 justifyEnd p={1.5} pt={1} pb={2.5}>
      <Button variant="outlined" onClick={onCancel}>
        Cancel
      </Button>
      <Button
        disabled={isSaveDisabled}
        variant="contained"
        onClick={() => {
          onSave();
          onCancel();
        }}
      >
        Apply
      </Button>
    </FlexBox>
  );
};

const CustomOption = () => {
  return (
    <FlexBox justifyBetween relative alignCenter mt={-2} pointer>
      <SubHeader
        medium
        sx={{
          px: 2,
          py: 3 / 2
        }}
      >
        {'Custom'}
      </SubHeader>
      <FlexBox width={'25px'} mr={1 / 2} centered>
        <FlexBox width={'8px'} height={'8px'} round bgcolor={'primary.dark'} />
      </FlexBox>
    </FlexBox>
  );
};
