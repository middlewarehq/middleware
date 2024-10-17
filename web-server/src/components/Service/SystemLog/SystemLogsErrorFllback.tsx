import { CircularProgress } from '@mui/material';
import { useEffect, useMemo, useRef } from 'react';

import { FlexBox } from '@/components/FlexBox';
import { PlainLog } from '@/components/Service/SystemLog/PlainLog';
import { SystemLogErrorMessage } from '@/components/Service/SystemLog/SystemLogErrorMessage';
import { Line } from '@/components/Text';
import { track } from '@/constants/events';
import { ServiceNames } from '@/constants/service';
import { useSystemLogs } from '@/hooks/useSystemLogs';

export const SystemLogsErrorFallback = ({
  error,
  serviceName
}: {
  error: Error;
  serviceName: ServiceNames;
}) => {
  const { services, loading, logs } = useSystemLogs({ serviceName });

  const containerRef = useRef<HTMLDivElement>(null);
  const errorBody = useMemo(
    () => ({
      message: error?.message?.replace('\\n', '\n') || '',
      stack: error?.stack?.replace('\\n', '\n') || ''
    }),
    [error]
  );

  useEffect(() => {
    if (error) {
      track('ERR_FALLBACK_SHOWN', { err: errorBody });
      console.error(error);
    }
  }, [errorBody, error]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <FlexBox col>
      {loading ? (
        <FlexBox alignCenter gap2>
          <CircularProgress size="20px" />
          <Line>Loading...</Line>
        </FlexBox>
      ) : (
        services &&
        logs.map((log, index) => {
          return <PlainLog log={log} index={index} key={index} />;
        })
      )}
      <FlexBox ref={containerRef} />
      <SystemLogErrorMessage errorBody={errorBody} />
    </FlexBox>
  );
};
