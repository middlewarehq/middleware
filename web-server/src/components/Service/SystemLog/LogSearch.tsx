import {
  Search as SearchIcon,
  Clear as ClearIcon,
  NavigateNext,
  NavigateBefore
} from '@mui/icons-material';
import {
  Button,
  InputAdornment,
  TextField,
  Typography,
  Box
} from '@mui/material';
import { styled } from '@mui/material/styles';
import debounce from 'lodash/debounce';
import { memo, useState, useCallback, useMemo, useEffect } from 'react';

import { MotionBox } from '@/components/MotionComponents';

const SearchContainer = styled('div')(() => ({
  position: 'sticky',
  top: 0,
  zIndex: 1,
  gap: 5,
  paddingBottom: 8,
  alignItems: 'center',
  backdropFilter: 'blur(10px)',
  borderRadius: 5
}));

const SearchControls = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginTop: 8
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: theme.palette.background.paper,
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      backgroundColor: theme.palette.background.paper,
      boxShadow: `0 0 0 1px ${theme.palette.primary.main}`
    },
    '&.Mui-focused': {
      backgroundColor: theme.palette.background.paper,
      boxShadow: `0 0 0 2px ${theme.palette.primary.main}`
    }
  }
}));

interface LogSearchProps {
  onSearch: (query: string) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  currentMatch: number;
  totalMatches: number;
}

const LogSearch = memo(({
  onSearch,
  onNavigate,
  currentMatch,
  totalMatches
}: LogSearchProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
        onSearch(query);
      }, 300),
    [onSearch]
  );

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const query = event.target.value;
      setSearchQuery(query);
      debouncedSearch(query);
    },
    [debouncedSearch]
  );

  const handleClear = useCallback(() => {
    setSearchQuery('');
    onSearch('');
    debouncedSearch.cancel();
  }, [onSearch, debouncedSearch]);

  const handleNavigate = useCallback(
    (direction: 'prev' | 'next') => {
      onNavigate(direction);
    },
    [onNavigate]
  );

  const showSearchControls = useMemo(
    () => searchQuery && totalMatches > 0,
    [searchQuery, totalMatches]
  );

  return (
    <SearchContainer>
      <StyledTextField
        fullWidth
        variant="outlined"
        placeholder="Search logs..."
        value={searchQuery}
        onChange={handleSearchChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
          endAdornment: searchQuery && (
            <InputAdornment position="end">
              <ClearIcon
                style={{ cursor: 'pointer' }}
                onClick={handleClear}
                color="action"
              />
            </InputAdornment>
          )
        }}
      />
      {showSearchControls && (
        <MotionBox
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{
            type: 'tween',
            ease: 'easeOut',
            duration: 0.3
          }}
        >
          <SearchControls>
            <Button
              size="small"
              onClick={() => handleNavigate('prev')}
              disabled={currentMatch === 1}
              startIcon={<NavigateBefore />}
              sx={{
                minWidth: '20px',
                padding: '4px 8px'
              }}
            />
            <Typography variant="body2" color="text.secondary">
              {currentMatch} of {totalMatches}
            </Typography>
            <Button
              size="small"
              onClick={() => handleNavigate('next')}
              disabled={currentMatch === totalMatches}
              startIcon={<NavigateNext />}
              sx={{
                minWidth: '20px',
                padding: '4px 8px'
              }}
            />
          </SearchControls>
        </MotionBox>
      )}
    </SearchContainer>
  );
});

LogSearch.displayName = 'LogSearch';

export { LogSearch };

