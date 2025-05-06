import { useTheme, styled } from '@mui/material';
import { useCallback } from 'react';

import { Line } from '@/components/Text';
import { ParsedLog } from '@/types/resources';

// Styled component for highlighted text
const HighlightSpan = styled('span', {
  shouldForwardProp: (prop) => prop !== 'isCurrentMatch'
})<{ isCurrentMatch?: boolean }>(({ theme, isCurrentMatch }) => ({
  backgroundColor: isCurrentMatch ? theme.palette.warning.main : 'yellow',
  color: isCurrentMatch ? 'white' : 'black',
  transition: theme.transitions.create(['background-color', 'color'], {
    duration: theme.transitions.duration.shortest
  })
}));

interface FormattedLogProps {
  log: ParsedLog;
  index: number;
  searchQuery?: string;
  isCurrentMatch?: boolean;
}

type SearchHighlightTextProps = {
  text: string;
  searchQuery?: string;
  isCurrentMatch?: boolean;
};

export const SearchHighlightText = ({
  text,
  searchQuery,
  isCurrentMatch,
}: SearchHighlightTextProps) => {
  if (!searchQuery) return <>{text}</>;

  const escapeRegExp = (string: string) =>
    string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const safeQuery = escapeRegExp(searchQuery);
  const regex = new RegExp(`(${safeQuery})`, 'gi');

  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === searchQuery.toLowerCase() ? (
          <HighlightSpan
            key={i}
            isCurrentMatch={isCurrentMatch}
            data-highlighted="true"
          >
            {part}
          </HighlightSpan>
        ) : (
          part
        )
      )}
    </>
  );
};

export const FormattedLog = ({ 
  log, 
  searchQuery, 
  isCurrentMatch 
}: FormattedLogProps) => {
  const theme = useTheme();
  const getLevelColor = useCallback(
    (level: string) => {
      const colors: { [key: string]: string } = {
        INFO: theme.colors.success.main,
        MAIN_INFO: theme.colors.success.main,
        CHILD_INFO: theme.colors.success.main,
        SENTINEL_INFO: theme.colors.success.main,
        WARN: theme.colors.warning.main,
        WARNING: theme.colors.warning.main,
        NOTICE: theme.colors.warning.dark,
        ERROR: theme.colors.error.main,
        FATAL: theme.colors.error.main,
        PANIC: theme.colors.error.main,
        DEBUG: theme.colors.info.light,
        MAIN_SYSTEM: theme.colors.primary.main,
        CHILD_SYSTEM: theme.colors.primary.main,
        SENTINEL_SYSTEM: theme.colors.primary.main,
        LOG: theme.colors.info.main,
        CRITICAL: theme.colors.error.main
      };

      return colors[level.toUpperCase()] || theme.colors.info.main;
    },
    [theme]
  );

  const { timestamp, ip, logLevel, message } = log;
  return (
    <Line mono marginBottom={1}>
      <Line component="span" color="info">
        <SearchHighlightText
         text={timestamp} 
         searchQuery={searchQuery} 
         isCurrentMatch={isCurrentMatch} 
        />
      </Line>{' '}
      {ip && (
        <Line component="span" color="primary">
          <SearchHighlightText
           text={ip} 
           searchQuery={searchQuery} 
           isCurrentMatch={isCurrentMatch} 
          />{' '}
        </Line>
      )}
      <Line component="span" color={getLevelColor(logLevel)}>
        [
        <SearchHighlightText 
          text={logLevel} 
          searchQuery={searchQuery} 
          isCurrentMatch={isCurrentMatch} 
        />
        ]
      </Line>{' '}
      <SearchHighlightText
        text={message}
        searchQuery={searchQuery}
        isCurrentMatch={isCurrentMatch} 
      />
    </Line>
  );
};
