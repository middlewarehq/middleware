import { useTheme } from '@mui/material';
import { useCallback } from 'react';

import { Line } from '@/components/Text';
import { ParsedLog } from '@/types/resources';

interface FormattedLogProps {
  log: ParsedLog;
  index: number;
  searchQuery?: string;
}

export const HighlightedText = ({ text, searchQuery }: { text: string; searchQuery?: string }) => {
  if (!searchQuery) return <>{text}</>;

  const escapeRegExp = (string: string) =>
    string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const safeQuery = escapeRegExp(searchQuery);
  const regex = new RegExp(`(${safeQuery})`, 'gi');

  const parts = text.split(regex);
  return <>{parts.map((part, i) =>
    part.toLowerCase() === searchQuery.toLowerCase()
      ? <span key={i} style={{ backgroundColor: 'yellow', color: 'black' }}>{part}</span>
      : part
  )}</>;
};

export const FormattedLog = ({ log, searchQuery }: FormattedLogProps) => {
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
        <HighlightedText text={timestamp} searchQuery={searchQuery} />
      </Line>{' '}
      {ip && (
        <Line component="span" color="primary">
          <HighlightedText text={ip} searchQuery={searchQuery} />{' '}
        </Line>
      )}
      <Line component="span" color={getLevelColor(logLevel)}>
        [<HighlightedText text={logLevel} searchQuery={searchQuery} />]
      </Line>{' '}
      <HighlightedText text={message} searchQuery={searchQuery} />
    </Line>
  );
};
