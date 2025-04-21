import { ExpandCircleDown } from '@mui/icons-material';
import { Button, CircularProgress } from '@mui/material';
import { useEffect, useRef, useState, useCallback } from 'react';
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

export const SystemLogs = ({ serviceName }: { serviceName?: ServiceNames }) => {
  const { services, loading, logs } = useSystemLogs({ serviceName });
  const containerRef = useRef<HTMLDivElement>(null);
  const showScrollDownButton = useBoolState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatch, setCurrentMatch] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [highlightedElements, setHighlightedElements] = useState<HTMLElement[]>([]);
  const currentHighlightRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      showScrollDownButton.set(scrollTop < scrollHeight - clientHeight - 100);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [showScrollDownButton]);

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
    setCurrentMatch(0);
    setTotalMatches(0);
    setHighlightedElements([]);
    updateHighlight(null);

    if (!query) return;

    useEffect(() => {
      const elements = Array.from(
        containerRef.current?.querySelectorAll('span[style*="background-color: yellow"]') ?? []
      ) as HTMLElement[];
      setHighlightedElements(elements);
      setTotalMatches(elements.length);
      setCurrentMatch(elements.length ? 1 : 0);

      if (elements.length) {
        updateHighlight(elements[0]);
        elements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, [searchQuery, logs, updateHighlight]);

  }, []);

  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    if (highlightedElements.length === 0) return;

    let newIndex = currentMatch;
    if (direction === 'next') {
      newIndex = currentMatch < totalMatches ? currentMatch + 1 : 1;
    } else {
      newIndex = currentMatch > 1 ? currentMatch - 1 : totalMatches;
    }

    setCurrentMatch(newIndex);
    const element = highlightedElements[newIndex - 1];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      updateHighlight(element);
    }
  }, [currentMatch, totalMatches, highlightedElements, updateHighlight]);

  return (
    <ErrorBoundary
      FallbackComponent={({ error }) => (
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
            {services &&
              logs.map((log, index) => {
                const parsedLog = parseLogLine(log);
                if (!parsedLog) {
                  return <PlainLog log={log} index={index} key={index} searchQuery={searchQuery} />;
                }
                return <FormattedLog log={parsedLog} index={index} key={index} searchQuery={searchQuery} />;
              })}
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
};
