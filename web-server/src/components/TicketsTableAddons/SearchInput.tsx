import { SearchRounded } from '@mui/icons-material';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import { IconButton, InputAdornment, TextField } from '@mui/material';
import { FC } from 'react';

export const SearchInput: FC<{
  inputHandler: (inputText: string) => void;
  inputText: string;
}> = ({ inputHandler, inputText }) => {
  return (
    <TextField
      variant="outlined"
      value={inputText}
      placeholder="Search items..."
      onChange={(e) => inputHandler(e.target.value)}
      InputProps={{
        startAdornment: <SearchRounded sx={{ mr: 1 }} />,
        endAdornment: (
          <InputAdornment position="end">
            {inputText && (
              <IconButton
                aria-label="Clear search"
                onClick={() => inputHandler('')}
                edge="end"
              >
                <ClearRoundedIcon />
              </IconButton>
            )}
          </InputAdornment>
        )
      }}
      sx={{ width: '350px' }}
    />
  );
};
