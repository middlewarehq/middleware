import {
  useTheme,
  Autocomplete,
  TextField,
  CircularProgress,
  ListItem,
  FilterOptionsState
} from '@mui/material';
import {
  AutocompleteInputChangeReason,
  createFilterOptions
} from '@mui/material/Autocomplete';
import {
  ChangeEvent,
  ComponentProps,
  FC,
  HTMLAttributes,
  MutableRefObject,
  ReactNode,
  SyntheticEvent,
  useCallback,
  useMemo
} from 'react';

import { useBoolState } from '@/hooks/useEasyState';
import { depFn } from '@/utils/fn';

import { FlexBox } from './FlexBox';
import { Line } from './Text';

export type AsyncSelectProps = {
  containerRef?: MutableRefObject<Element>;
  options: AsyncSelectOptions;
  value: AsyncSelectOption | AsyncSelectOptions | null;
  onChange: (
    opt: AsyncSelectOption | AsyncSelectOptions,
    ev: SyntheticEvent<Element, Event>
  ) => any;
  loading?: boolean;
  loadOptions?: AnyAsyncFunction;
  label?: ReactNode;
  placeholder?: string;
  sx?: ComponentProps<typeof Autocomplete>['sx'];
  clearable?: boolean;
  filterOptions?: (
    options: AsyncSelectOptions,
    params: any
  ) => AsyncSelectOption<any>[];
  isOptionEqualToChecker?: (
    option: AsyncSelectOption,
    selected: AsyncSelectOption
  ) => boolean;
  multiple?: boolean;
  /** If entered value matches no options, show an additional "add new" option */
  addIfMissing?: boolean;
  inputValue?: string;
  onInputChange?: (
    event: SyntheticEvent<HTMLInputElement, ChangeEvent>,
    value: string,
    reason: AutocompleteInputChangeReason
  ) => void;
  size?: ComponentProps<typeof Autocomplete>['size'];
  nextPageToken?: string | null;
  disableCloseOnSelect?: boolean;
};

const CUSTOM_NEW_OPTION_ID = 'CUSTOM_NEW_OPTION_ID';

const LOAD_PAGINATION_OPTION = {
  value: 'load-more',
  label: 'Load More'
};

export const AsyncSelect: FC<AsyncSelectProps> = ({
  containerRef,
  multiple,
  options = [],
  loading: _loading,
  loadOptions,
  label,
  placeholder = 'Select...',
  sx,
  onChange,
  value,
  clearable = true,
  filterOptions: _filterOptions,
  isOptionEqualToChecker,
  addIfMissing,
  inputValue,
  onInputChange,
  size = 'small',
  nextPageToken = '',
  disableCloseOnSelect = false
}) => {
  const open = useBoolState();
  const theme = useTheme();
  const isLoading = useBoolState();

  const loadOpts = useCallback(() => {
    depFn(open.true);
    loadOptions && depFn(isLoading.trackAsync, loadOptions);
  }, [loadOptions, isLoading.trackAsync, open.true]);

  const filterOptions = useMemo(() => {
    if (_filterOptions) return _filterOptions;
    if (!addIfMissing) return undefined;

    const filter = createFilterOptions<AsyncSelectOption>();
    return (options: AsyncSelectOption[], state: FilterOptionsState<any>) => {
      const filtered = filter(options, state);
      const { inputValue } = state;
      const isExisting = options.some((option) => inputValue === option.value);
      if (inputValue !== '' && !isExisting) {
        filtered.push({
          value: CUSTOM_NEW_OPTION_ID,
          label: inputValue,
          renderLabel: (
            <FlexBox whiteSpace="pre">
              <Line white>Add</Line>&nbsp;
              <Line white medium underline dotted>
                {inputValue}
              </Line>
            </FlexBox>
          )
        });
      }
      return filtered;
    };
  }, [_filterOptions, addIfMissing]);

  const loading = _loading || isLoading.value;
  const loadableOptions =
    nextPageToken && options.length > 0
      ? [
          ...options,
          {
            ...LOAD_PAGINATION_OPTION,
            renderLabel: (
              <FlexBox
                fullWidth
                justifyCenter
                alignCenter
                sx={{
                  fontSize: '12px'
                }}
              >
                {loading ? 'Loading...' : LOAD_PAGINATION_OPTION.label}
              </FlexBox>
            )
          }
        ]
      : [...options];

  const RenderAutocompleteOption = (
    props: HTMLAttributes<HTMLLIElement>,
    option: AsyncSelectOption
  ) => {
    return (
      <ListItem
        {...props}
        onClick={(e) => {
          if (option.value === LOAD_PAGINATION_OPTION.value) {
            loadOptions();
          } else {
            open.false();
          }
          eventNoOp(e);
          props.onClick?.(e);
        }}
        sx={{ hyphens: 'auto' }}
      >
        {option.renderLabel || option.label}
      </ListItem>
    );
  };

  return (
    <Autocomplete
      componentsProps={
        containerRef
          ? {
              popper: {
                container: containerRef.current
              }
            }
          : undefined
      }
      disableCloseOnSelect={disableCloseOnSelect}
      options={loadableOptions}
      value={value}
      loading={loading}
      multiple={multiple}
      disableClearable={!clearable}
      onChange={(ev, opt) =>
        onChange(opt as AsyncSelectOption | AsyncSelectOptions, ev)
      }
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder}
          onClick={eventNoOp}
          label={label}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <FlexBox gap1 alignCenter>
                {loading ? (
                  <CircularProgress
                    color="inherit"
                    size={theme.spacing(2)}
                    sx={{ mr: '7px' }}
                  />
                ) : null}
                {params.InputProps.endAdornment}
              </FlexBox>
            )
          }}
        />
      )}
      size={size}
      sx={{
        '.MuiAutocomplete-endAdornment': { marginRight: '-8px !important' },
        '.MuiAutocomplete-clearIndicator': {
          marginRight: '2px'
        },
        ...sx
      }}
      open={open.value}
      onOpen={loadOpts}
      onClick={eventNoOp}
      onSelect={eventNoOp}
      onClose={open.false}
      isOptionEqualToValue={isOptionEqualToChecker || isOptionEqualToValue}
      getOptionLabel={getOptionLabel}
      renderOption={RenderAutocompleteOption}
      filterOptions={filterOptions}
      inputValue={inputValue}
      onInputChange={onInputChange as any}
    />
  );
};

export type AsyncSelectOption<T = any> = {
  label: string;
  renderLabel?: ReactNode;
  value: T;
} & Record<string, any>;

export type AsyncSelectOptions<T = any> = AsyncSelectOption<T>[];

const eventNoOp = (e: any) => {
  e.preventDefault();
  e.stopPropagation();
};

const isOptionEqualToValue = (
  option: AsyncSelectOption,
  selected: AsyncSelectOption
) => option.value === selected?.value;

const getOptionLabel = (option: AsyncSelectOption) => option.label as string;
