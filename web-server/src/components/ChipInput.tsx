import {
  Autocomplete,
  AutocompleteProps,
  TextField,
  TextFieldProps
} from '@mui/material';
import { uniq } from 'ramda';
import { FC, KeyboardEventHandler, SyntheticEvent, useCallback } from 'react';

import { useEasyState } from '@/hooks/useEasyState';
import { depFn } from '@/utils/fn';

type OnInputChange = (ev: SyntheticEvent, value: string) => any;

export const ChipInput: FC<{
  placeholder: string;
  values: string[];
  onChange: (updatedValues: string[]) => void;
  onKeyDown?: KeyboardEventHandler;
  onSubmit?: (values: string[]) => void;
  textFieldProps?: TextFieldProps;
  autocompleteProps?: Partial<AutocompleteProps<any, true, false, true>>;
}> = ({
  placeholder = '',
  values,
  onChange: updateValue,
  onKeyDown = () => {},
  onSubmit = () => {},
  textFieldProps,
  autocompleteProps
}) => {
  const userInput = useEasyState('');

  const handleInputChange: OnInputChange = useCallback(
    (e, val) => {
      e.preventDefault();
      depFn(userInput.set, val);

      const enterPressed = (e as unknown as KeyboardEvent).key === 'Enter';

      const inputValue = val.trim();
      if (!inputValue.endsWith(',') && !enterPressed) {
        return;
      }

      const trimmedValue = inputValue.replaceAll(',', '').trim();
      if (trimmedValue.length) {
        const uniqueValues = uniq([...values, trimmedValue]);
        updateValue(uniqueValues);
        if (enterPressed) onSubmit(uniqueValues);
      }

      depFn(userInput.set, '');
    },
    [userInput.set, values, updateValue, onSubmit]
  );

  return (
    <Autocomplete
      multiple
      freeSolo
      options={[]}
      value={values}
      inputValue={userInput.value}
      onInputChange={handleInputChange}
      onChange={(_, newValue: string[]) => {
        updateValue(uniq(newValue));
        onSubmit(uniq(newValue));
      }}
      fullWidth
      renderInput={(params) => (
        <TextField
          {...params}
          autoFocus
          variant="outlined"
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.stopPropagation();
              handleInputChange(e, (e.target as HTMLInputElement).value);
              requestAnimationFrame(() => onKeyDown(e));
            } else onKeyDown(e);
          }}
          {...textFieldProps}
        />
      )}
      {...autocompleteProps}
    />
  );
};
