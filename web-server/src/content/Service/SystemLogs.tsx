import { CircularProgress } from '@mui/material';
import { useEffect, useRef } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { FlexBox } from '@/components/FlexBox';
import { FormattedLog } from '@/components/Service/SystemLog/FormattedLog';
import { PlainLog } from '@/components/Service/SystemLog/PlainLog';
import { SystemLogsErrorFallback } from '@/components/Service/SystemLog/SystemLogsErrorFllback';
import { SomethingWentWrong } from '@/components/SomethingWentWrong/SomethingWentWrong';
import { Line } from '@/components/Text';
import { ServiceNames } from '@/constants/service';
import { useSystemLogs } from '@/hooks/useSystemLogs';
import { parseLogLine } from '@/utils/logFormatter';

export const SystemLogs = ({ serviceName }: { serviceName?: ServiceNames }) => {
  const { services, loading, logs } = useSystemLogs({ serviceName });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  if (!serviceName)
    return (
      <SomethingWentWrong desc="Unspecified Service. This might be a product bug. Please contact us to let us know.;" />
    );

  return (
    <ErrorBoundary
      FallbackComponent={({ error }) => (
        <SystemLogsErrorFallback error={error} serviceName={serviceName} />
      )}
    >
      <FlexBox col>
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
              return <PlainLog log={log} index={index} key={index} />;
            }
            return <FormattedLog log={parsedLog} index={index} key={index} />;
          })
        )}
        <FlexBox ref={containerRef} />
      </FlexBox>
    </ErrorBoundary>
  );
};
