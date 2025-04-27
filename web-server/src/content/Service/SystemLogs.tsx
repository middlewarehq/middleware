import { ExpandCircleDown } from '@mui/icons-material';
import { Button, CircularProgress } from '@mui/material';
import { useEffect, useRef, useState, useCallback, useLayoutEffect, memo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { FlexBox } from '@/components/FlexBox';
import { FormattedLog } from '@/components/Service/SystemLog/FormattedLog';
import { LogSearch } from '@/components/Service/SystemLog/LogSearch';
import { PlainLog } from '@/components/Service/SystemLog/PlainLog';
import { SystemLogsErrorFallback } from '@/components/Service/SystemLog/SystemLogsErrorFllback';
import { Line } from '@/components/Text';
import { ServiceNames } from '@/constants/service';
import { useBoolState } from '@/hooks/useEasyState';
import { useSystemLogs } from '@/hooks/useSystemLogs';
import { parseLogLine } from '@/utils/logFormatter';

import { MotionBox } from '../../components/MotionComponents';

const SystemLogs = memo(({ serviceName }: { serviceName?: ServiceNames }) => {
  const { services, loading, logs } = useSystemLogs({ serviceName });
  const containerRef = useRef<HTMLDivElement>(null);
  const showScrollDownButton = useBoolState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [currentMatch, setCurrentMatch] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [highlightedElements, setHighlightedElements] = useState<HTMLElement[]>([]);
  const currentHighlightRef = useRef<HTMLElement | null>(null);
  const isInitialLoad = useRef(true);
  const isSearchingRef = useRef(false);
  const currentMatchRef = useRef(0);
  const totalMatchesRef = useRef(0);
  const highlightedElementsRef = useRef<HTMLElement[]>([]);
  const isNavigatingRef = useRef(false);

  // Debounce search query updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, []);

  const updateHighlight = useCallback((element: HTMLElement | null) => {
    if (currentHighlightRef.current) {
      currentHighlightRef.current.style.backgroundColor = 'yellow';
      currentHighlightRef.current.style.color = 'black';
    }

    if (element) {
      element.style.backgroundColor = 'rgb(255, 161, 10)';
      element.style.color = 'white';
      currentHighlightRef.current = element;
    } else {
      currentHighlightRef.current = null;
    }
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    isSearchingRef.current = !!query;
  
    if (!query || query.length < 3) {
      setCurrentMatch(0);
      currentMatchRef.current = 0;
      setTotalMatches(0);
      totalMatchesRef.current = 0;
      setHighlightedElements([]);
      highlightedElementsRef.current = [];
      updateHighlight(null);
      return;
    }
  }, [updateHighlight]);
  
  useLayoutEffect(() => {
    if (!debouncedSearchQuery || debouncedSearchQuery.length < 3) return;
  
    const elements = Array.from(
      containerRef.current?.querySelectorAll('span[style*="background-color: yellow"]') ?? []
    ) as HTMLElement[];
  
    setHighlightedElements(elements);
    highlightedElementsRef.current = elements;
    const newTotalMatches = elements.length;
    setTotalMatches(newTotalMatches);
    totalMatchesRef.current = newTotalMatches;
    
    if (currentMatchRef.current === 0) {
      setCurrentMatch(newTotalMatches ? 1 : 0);
      currentMatchRef.current = newTotalMatches ? 1 : 0;
    }
  }, [debouncedSearchQuery]);

  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    if (highlightedElementsRef.current.length === 0 || isNavigatingRef.current) return;

    isNavigatingRef.current = true;
    requestAnimationFrame(() => {
      let newIndex = currentMatchRef.current;
      const total = totalMatchesRef.current;

      if (direction === 'next') {
        newIndex = newIndex < total ? newIndex + 1 : 1;
      } else {
        newIndex = newIndex > 1 ? newIndex - 1 : total;
      }

      setCurrentMatch(newIndex);
      currentMatchRef.current = newIndex;
      const element = highlightedElementsRef.current[newIndex - 1];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        updateHighlight(element);
      }
      isNavigatingRef.current = false;
    });
  }, [updateHighlight]);

  useEffect(() => {
    if (!loading && logs.length && containerRef.current && isInitialLoad.current) {
      isInitialLoad.current = false;
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTo({
            top: containerRef.current.scrollHeight,
            behavior: 'auto'
          });
        }
      });
    }
  }, [loading, logs]);

  const renderLogs = useCallback(() => {
    return logs.map((log, index) => {
      const parsedLog = parseLogLine(log);
      return (
        <div key={index}>
          {!parsedLog ? (
            <PlainLog log={log} index={index} searchQuery={debouncedSearchQuery} />
          ) : (
            <FormattedLog log={parsedLog} index={index} searchQuery={debouncedSearchQuery} />
          )}
        </div>
      );
    });
  }, [logs, debouncedSearchQuery]);

  return (
    <ErrorBoundary
      FallbackComponent={({ error }: { error: Error }) => (
        <SystemLogsErrorFallback error={error} serviceName={serviceName} />
      )}
    >
      <FlexBox col>
        <LogSearch
          onSearch={handleSearch}
          onNavigate={handleNavigate}
          currentMatch={currentMatch}
          totalMatches={totalMatches}
        />
        {loading ? (
          <FlexBox alignCenter gap2>
            <CircularProgress size="20px" />
            <Line>Loading...</Line>
          </FlexBox>
        ) : (
          <FlexBox ref={containerRef} col sx={{ overflowY: 'auto', maxHeight: '100%' }}>
            {services && renderLogs()}
          </FlexBox>
        )}

        {showScrollDownButton.value && (
          <Button
            onClick={scrollToBottom}
            component={MotionBox}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              ease: 'easeOut'
            }}
            bottom={20}
            sx={{
              position: 'fixed',
              marginLeft: `calc(${containerRef.current
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
});

export { SystemLogs };
