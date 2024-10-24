import { TextField, Button } from '@mui/material';
import { CircularProgress } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { FlexBox } from '@/components/FlexBox';
import { FormattedLog } from '@/components/Service/SystemLog/FormattedLog';
import { PlainLog } from '@/components/Service/SystemLog/PlainLog';
import { SystemLogsErrorFallback } from '@/components/Service/SystemLog/SystemLogsErrorFllback';
import { Line } from '@/components/Text';
import { ServiceNames } from '@/constants/service';
import { useSystemLogs } from '@/hooks/useSystemLogs';
import { parseLogLine } from '@/utils/logFormatter';
import './searchfunctionality.css';
export const SystemLogs = ({ serviceName }: { serviceName: ServiceNames }) => {
  const { services, loading, logs } = useSystemLogs({ serviceName });

  const containerRef = useRef<HTMLDivElement>(null);
  const [searchLog, setSearchLog] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [searchResults, setSearchResults] = useState<number[]>([]);

  useEffect(() => {
    if (searchLog) {
      const indices = logs
        .map((log, index) => (log.includes(searchLog) ? index : -1))
        .filter((index) => index !== -1);
      setSearchResults(indices);
      setHighlightedIndex(indices.length ? 0 : -1);
    } else {
      setSearchResults([]);
      setHighlightedIndex(-1);
    }
  }, [searchLog, logs]);

  const handleNext = () => {
    if (highlightedIndex < searchResults.length - 1) {
      setHighlightedIndex(highlightedIndex + 1);
    }
  };

  const handlePrev = () => {
    if (highlightedIndex > 0) {
      setHighlightedIndex(highlightedIndex - 1);
    }
  };

  useEffect(() => {
    if (highlightedIndex !== -1 && searchResults[highlightedIndex] !== undefined) {
      const element = document.getElementById(`log-${searchResults[highlightedIndex]}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightedIndex, searchResults]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <ErrorBoundary
      FallbackComponent={({ error }) => (
        <SystemLogsErrorFallback error={error} serviceName={serviceName} />
      )}
    >
      <FlexBox col>
        <FlexBox className="sticky-search-container">
          <TextField
            label="Search Logs"
            value={searchLog}
            onChange={(e) => setSearchLog(e.target.value)}
            size="small"
            className="search-input"
          />
          <FlexBox gap2>
            <Button
              onClick={handlePrev}
              sx={{ display: highlightedIndex <= 0 ? 'none' : 'block' }}
              className="nav-button"
            >
              Prev
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 22 22"
                stroke="currentColor"
                strokeWidth={2}
                width="20px"
                height="15px"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </Button>
            <Button
              onClick={handleNext}
              sx={{ display: highlightedIndex >= searchResults.length - 1 ? 'none' : 'block' }}
              className="nav-button"
            >
              Next
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 22 22"
                stroke="currentColor"
                strokeWidth={2}
                width="20px"
                height="15px"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </Button>
          </FlexBox>
        </FlexBox>

        {loading ? (
          <FlexBox alignCenter gap2>
            <CircularProgress size="20px" />
            <Line>Loading...</Line>
          </FlexBox>
        ) : (
          services &&
          logs.map((log, index) => {
            const isHighlighted = searchResults.includes(index);
            const isCurrent = index === searchResults[highlightedIndex];
            const parsedLog = parseLogLine(log);

            const logStyle = {
              backgroundColor: isCurrent ? '#ffff004d' : isHighlighted ? '#ffffe04d' : 'transparent',
              color: isCurrent || isHighlighted ? '#ffffffcc' : 'inherit',
            };

            if (!parsedLog) {
              return <PlainLog log={log} index={index} key={index} style={logStyle} />;
            }

            return <FormattedLog log={parsedLog} index={index} key={index} style={logStyle} />;
          })
        )}
        <FlexBox ref={containerRef} />
      </FlexBox>
    </ErrorBoundary>
  );
};
