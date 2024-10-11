import { CopyAll } from '@mui/icons-material';
import { Button, CircularProgress, Typography, useTheme } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { track } from '@/constants/events';
import { ParsedLog } from '@/constants/log-formatter';
import { ServiceNames } from '@/constants/service';
import { useSelector } from '@/store';
import { parseLogLine } from '@/utils/logFormatter';

export const SystemLogs = ({ serviceName }: { serviceName: ServiceNames }) => {
  const services = useSelector((state) => state.service.services);
  const loading = useSelector((state) => state.service.loading);
  const [error, setError] = useState<Error | null>(null);
  const theme = useTheme();
  const logs = useMemo(() => {
    return services[serviceName].logs || [];
  }, [serviceName, services]);

  const containerRef = useRef<HTMLDivElement>(null);
  const { enqueueSnackbar } = useSnackbar();
  const errorBody = useMemo(
    () => ({
      message: error?.message?.replace('\\n', '\n'),
      stack: error?.stack?.replace('\\n', '\n')
    }),
    [error?.message, error?.stack]
  );

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

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => {
    if (error) {
      track('ERR_FALLBACK_SHOWN', { err: errorBody });
      console.error(error);
    }
  }, [errorBody, error]);

  const SystemLogErrorMessage = useCallback(
    ({ errorBody }: { errorBody: any }) => {
      return (
        <FlexBox alignCenter gap={1}>
          <Line tiny color="warning.main" fontWeight="bold">
            <Typography variant="h6">
              Something went wrong displaying the logs.
            </Typography>
            An error occurred while processing the logs. Please report this
            issue.
          </Line>
          <CopyToClipboard
            text={JSON.stringify(errorBody, null, '  ')}
            onCopy={() => {
              enqueueSnackbar(`Error logs copied to clipboard`, {
                variant: 'success'
              });
            }}
          >
            <Button
              size="small"
              variant="contained"
              startIcon={<CopyAll />}
              sx={{ fontWeight: 'bold' }}
            >
              Copy Logs
            </Button>
          </CopyToClipboard>
          <Button
            variant="contained"
            size="small"
            href="https://github.com/middlewarehq/middleware/issues/new/choose"
            target="_blank"
            rel="noopener noreferrer"
          >
            Report Issue
          </Button>
        </FlexBox>
      );
    },
    [enqueueSnackbar]
  );

  const PlainLog = useCallback(
    ({ log, index }: { log: string; index: number }) => {
      return (
        <Line
          key={index}
          marginBottom={'8px'}
          fontSize={'14px'}
          fontFamily={'monospace'}
        >
          {log}
        </Line>
      );
    },
    []
  );

  const FormattedLog = useCallback(
    ({ log, index }: { log: ParsedLog; index: number }) => {
      const { timestamp, ip, logLevel, message } = log;
      return (
        <Line
          key={index}
          marginBottom={'8px'}
          fontSize={'14px'}
          fontFamily={'monospace'}
        >
          <Line component="span" color="info.main">
            {timestamp}
          </Line>{' '}
          {ip && (
            <Line component="span" color="primary.main">
              {ip}{' '}
            </Line>
          )}
          <Line component="span" color={getLevelColor(logLevel)}>
            [{logLevel}]
          </Line>{' '}
          {message}
        </Line>
      );
    },
    [getLevelColor]
  );

  return (
    <FlexBox col>
      {loading ? (
        <FlexBox alignCenter gap2>
          <CircularProgress size="20px" />
          <Line>Loading...</Line>
        </FlexBox>
      ) : !error && services ? (
        logs.map((log, index) => {
          try {
            const parsedLog = parseLogLine(log);

            if (!parsedLog) {
              return <PlainLog log={log} index={index} key={index} />;
            }
            return <FormattedLog log={parsedLog} index={index} key={index} />;
          } catch (error: any) {
            setError(error);
            return null;
          }
        })
      ) : (
        services && (
          <>
            {logs.map((log, index) => (
              <PlainLog log={log} index={index} key={index} />
            ))}
            <SystemLogErrorMessage errorBody={errorBody} />
          </>
        )
      )}
      <FlexBox ref={containerRef} />
    </FlexBox>
  );
};
