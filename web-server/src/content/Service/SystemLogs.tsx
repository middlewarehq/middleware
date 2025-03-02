import { ExpandCircleDown } from '@mui/icons-material';
import { Button, CircularProgress } from '@mui/material';
import { useEffect, useRef } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { FlexBox } from '@/components/FlexBox';
import { FormattedLog } from '@/components/Service/SystemLog/FormattedLog';
import { PlainLog } from '@/components/Service/SystemLog/PlainLog';
import { SystemLogsErrorFallback } from '@/components/Service/SystemLog/SystemLogsErrorFllback';
import { SomethingWentWrong } from '@/components/SomethingWentWrong/SomethingWentWrong';
import { Line } from '@/components/Text';
import { ServiceNames } from '@/constants/service';
import { useBoolState } from '@/hooks/useEasyState';
import { useSystemLogs } from '@/hooks/useSystemLogs';
import { parseLogLine } from '@/utils/logFormatter';

import { MotionBox } from '../../components/MotionComponents';

export const SystemLogs = ({ serviceName }: { serviceName?: ServiceNames }) => {
  const { services, loading, logs } = useSystemLogs({ serviceName });
  const showScrollDownButton = useBoolState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollDown = () => {
    containerRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            showScrollDownButton.false();
          } else {
            showScrollDownButton.true();
          }
        });
      },
      {
        threshold: 0
      }
    );

    const containerElement = containerRef.current;

    if (containerRef.current) {
      observer.observe(containerElement);
    }

    return () => {
      if (containerElement) {
        observer.unobserve(containerElement);
      }
    };
  }, [showScrollDownButton]);

  useEffect(() => {
    if (containerRef.current && !showScrollDownButton.value) {
      scrollDown();
    }
  }, [logs, showScrollDownButton.value]);

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

        {showScrollDownButton.value && (
          <Button
            onClick={scrollDown}
            component={MotionBox}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              ease: 'easeOut'
            }}
            bottom={20}
            sx={{
              position: 'fixed',
              marginLeft: `calc(${
                containerRef.current
                  ? containerRef.current.clientWidth / 2 - 67
                  : 0
              }px)`
            }}
          >
            <ExpandCircleDown fontSize="large" color="secondary" />
          </Button>
        )}
      </FlexBox>
    </ErrorBoundary>
  );
};
