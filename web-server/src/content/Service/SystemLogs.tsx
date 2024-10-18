import { TextField, Button } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { useEffect, useRef, useMemo, useState } from 'react';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { ServiceNames } from '@/constants/service';
import { useSelector } from '@/store';
import './search-functionality.css';

export const SystemLogs = ({ serviceName }: { serviceName: ServiceNames }) => {
  const services = useSelector((state) => state.service.services);
  const loading = useSelector((state) => state.service.loading);
  const logs = useMemo(() => {
    return services[serviceName].logs || [];
  }, [serviceName, services]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [searchLog, setSearchLog] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [searchResults, setSearchResults] = useState<number[]>([]);

  // Find matching logs based on searchLog
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
    if (
      highlightedIndex !== -1 &&
      searchResults[highlightedIndex] !== undefined
    ) {
      const element = document.getElementById(
        `log-${searchResults[highlightedIndex]}`
      );
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
            sx={{ display: highlightedIndex <= 0 ? 'none':'block' }}
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
          </Button>
          <Button
            onClick={handleNext}
            sx={{ display: highlightedIndex >= searchResults.length - 1  ? 'none':'block' }}
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
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

          return (
            <Line
              key={index}
              id={`log-${index}`}
              marginBottom={'8px'}
              fontSize={'14px'}
              fontFamily={'monospace'}
              style={{
                backgroundColor: isCurrent
                  ? '#ffff004d'
                  : isHighlighted
                  ? '#ffffe080'
                  : 'transparent',
                color: isCurrent || isHighlighted ? '#ffffffcc' : 'inherit'
              }}
            >
              {log.split(searchLog).map((part, idx) => (
                <span key={idx}>
                  {idx > 0 && (
                    <span style={{ backgroundColor: 'yellow', color: 'black'}}>
                      {searchLog}
                    </span>
                  )}
                  {part}
                </span>
              ))}
            </Line>
          );
        })
      )}
      <FlexBox ref={containerRef} />
    </FlexBox>
  );
};
