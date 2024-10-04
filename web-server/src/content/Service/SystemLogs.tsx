import { CircularProgress, useTheme } from '@mui/material';
import { useEffect, useRef, useMemo } from 'react';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { ServiceNames } from '@/constants/service';
import { useSelector } from '@/store';
import { parseLogLine } from '@/utils/logFormater';

export const SystemLogs = ({ serviceName }: { serviceName: ServiceNames }) => {
  const services = useSelector((state) => state.service.services);
  const loading = useSelector((state) => state.service.loading);
  const theme = useTheme();
  const logs = useMemo(() => {
    return services[serviceName].logs || [];
  }, [serviceName, services]);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <FlexBox ref={containerRef} col>
      {loading ? (
        <FlexBox alignCenter gap2>
          <CircularProgress size="20px" />
          <Line>Loading...</Line>
        </FlexBox>
      ) : (
        services &&
        logs.map((log, index) => {
          const parsedLog = parseLogLine(log);
          if (!parsedLog) {
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
          }
          const { timestamp, ip, logLevel, message, metadata } = parsedLog;
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
              <Line component="span" color={getLevelColor(logLevel, theme)}>
                [{logLevel}]
              </Line>{' '}
              {message}
              {metadata && (
                <Line component="span" color="text.secondary" ml={1}>
                  {Object.entries(metadata).map(([key, value]) => (
                    <Line component="span" key={key}>
                      {key}: {JSON.stringify(value)}{' '}
                    </Line>
                  ))}
                </Line>
              )}
            </Line>
          );
        })
      )}
    </FlexBox>
  );
};

const getLevelColor = (level: string, theme: any): string => {
  const colors: { [key: string]: string } = {
    INFO: theme.colors.success.main,
    MAIN_INFO: theme.colors.success.main,
    CHILD_INFO: theme.colors.success.main,
    SENTINEL_INFO: theme.colors.success.main,
    WARN: theme.colors.warning.main,
    WARNING: theme.colors.warning.main,
    NOTICE: theme.colors.warning.main,
    ERROR: theme.colors.error.main,
    FATAL: theme.colors.error.main,
    PANIC: theme.colors.error.main,
    DEBUG: theme.colors.info.main,
    MAIN_SYSTEM: theme.colors.primary.main,
    CHILD_SYSTEM: theme.colors.primary.main,
    SENTINEL_SYSTEM: theme.colors.primary.main,
    LOG: theme.colors.info.main,
    CRITICAL: theme.colors.error.main
  };

  return colors[level.toUpperCase()] || theme.colors.info.main;
};