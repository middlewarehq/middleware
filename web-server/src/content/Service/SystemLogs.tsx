import { ExpandCircleDown } from '@mui/icons-material';
import { Button, CircularProgress } from '@mui/material';
import {
  useEffect,
  useRef,
  useCallback,
  useReducer,
  memo,
  useState
} from 'react';

import { FlexBox } from '@/components/FlexBox';
import { FormattedLog } from '@/components/Service/SystemLog/FormattedLog';
import { LogSearch } from '@/components/Service/SystemLog/LogSearch';
import { PlainLog } from '@/components/Service/SystemLog/PlainLog';
import { Line } from '@/components/Text';
import { ServiceNames } from '@/constants/service';
import { useBoolState } from '@/hooks/useEasyState';
import { useSystemLogs } from '@/hooks/useSystemLogs';
import { parseLogLine } from '@/utils/logFormatter';

import { MotionBox } from '../../components/MotionComponents';

type SearchState = {
  query: string;
  elements: HTMLElement[];
  selectedIndex: number | null;
  isSearching: boolean;
};

type SearchAction =
  | { type: 'SET_QUERY'; payload: string }
  | { type: 'SET_MATCHES'; payload: HTMLElement[] }
  | { type: 'SET_SELECTED_INDEX'; payload: number | null }
  | { type: 'SET_SEARCHING'; payload: boolean }
  | { type: 'RESET' };

const initialSearchState: SearchState = {
  query: '',
  elements: [],
  selectedIndex: null,
  isSearching: false
};

function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case 'SET_QUERY':
      return {
        ...state,
        query: action.payload,
        isSearching: !!action.payload
      };
    case 'SET_MATCHES': {
      const newElements = action.payload;
      return {
        ...state,
        elements: newElements,
        selectedIndex: newElements.length > 0 ? 0 : null,
        isSearching: false
      };
    }
    case 'SET_SELECTED_INDEX':
      return { ...state, selectedIndex: action.payload };
    case 'SET_SEARCHING':
      return { ...state, isSearching: action.payload };
    case 'RESET':
      return initialSearchState;
    default:
      return state;
  }
}

const SystemLogs = memo(({ serviceName }: { serviceName?: ServiceNames }) => {
  const { services, loading, logs } = useSystemLogs({ serviceName });
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<number>(0);
  const showScrollDownButton = useBoolState(false);
  const showScrollUpButton = useBoolState(false);
  const [searchState, dispatch] = useReducer(searchReducer, initialSearchState);
  const isInitialLoad = useRef(true);
  const [currentMatchLineIndex, setCurrentMatchLineIndex] = useState<
    number | null
  >(null);

  useEffect(() => {
    if (!searchState.query || searchState.query.length < 3) {
      dispatch({ type: 'SET_MATCHES', payload: [] });
      setCurrentMatchLineIndex(null);
      return;
    }

    dispatch({ type: 'SET_SEARCHING', payload: true });

    const timer = setTimeout(() => {
      if (!containerRef.current) return;

      requestAnimationFrame(() => {
        const elements = Array.from(
          containerRef.current?.querySelectorAll('.mhq--highlighted-log') ?? []
        ) as HTMLElement[];

        dispatch({ type: 'SET_MATCHES', payload: elements });
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchState.query]);

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTo({
            top: containerRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      });
    }
  }, []);

  const scrollToTop = useCallback(() => {
    if (containerRef.current) {
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }
      });
    }
  }, []);

  const handleSearch = useCallback((query: string) => {
    dispatch({ type: 'SET_QUERY', payload: query });
  }, []);

  const handleNavigate = useCallback(
    (direction: 'prev' | 'next') => {
      const { elements, selectedIndex, isSearching } = searchState;
      const total = elements.length;

      if (total === 0 || isSearching || selectedIndex === null) return;

      if (direction === 'next') {
        const newIndex = (selectedIndex + 1) % total;
        dispatch({ type: 'SET_SELECTED_INDEX', payload: newIndex });
      } else {
        const newIndex = selectedIndex > 0 ? selectedIndex - 1 : total - 1;
        dispatch({ type: 'SET_SELECTED_INDEX', payload: newIndex });
      }
    },
    [searchState]
  );

  const handleLogSelect = useCallback(
    (lineIndex: number) => {
      setCurrentMatchLineIndex(lineIndex);

      requestAnimationFrame(() => {
        const elements = searchState.elements;
        if (elements[searchState.selectedIndex || 0]) {
          elements[searchState.selectedIndex || 0].scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      });
    },
    [searchState.elements, searchState.selectedIndex]
  );

  useEffect(() => {
    const { selectedIndex, elements } = searchState;
    if (selectedIndex === null || !elements.length) {
      setCurrentMatchLineIndex(null);
      return;
    }

    const element = elements[selectedIndex];
    if (!element) return;

    const lineIndex = parseInt(
      element.closest('[data-log-index]')?.getAttribute('data-log-index') ||
        '-1',
      10
    );
    if (lineIndex >= 0) {
      handleLogSelect(lineIndex);
    }
  }, [searchState.selectedIndex, searchState.elements, handleLogSelect]);

  useEffect(() => {
    if (
      !loading &&
      logs.length &&
      containerRef.current &&
      isInitialLoad.current
    ) {
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (scrollTimeoutRef.current) {
        cancelAnimationFrame(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = requestAnimationFrame(() => {
        if (!containerRef.current) return;

        const { scrollTop, clientHeight, scrollHeight } = containerRef.current;

        // Show up button if scrolled down
        const isScrolledDown = scrollTop > 200;
        showScrollUpButton.set(isScrolledDown);

        // Show down button if not at bottom
        const isNotAtBottom = scrollTop < scrollHeight - clientHeight - 200;
        showScrollDownButton.set(isNotAtBottom);
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (scrollTimeoutRef.current) {
        cancelAnimationFrame(scrollTimeoutRef.current);
      }
      container.removeEventListener('scroll', handleScroll);
    };
  }, [showScrollDownButton, showScrollUpButton]);

  const renderLogs = useCallback(() => {
    return logs.map((log, index) => {
      const parsedLog = parseLogLine(log);
      const isCurrentMatch = index === currentMatchLineIndex;

      return (
        <div
          key={index}
          data-log-index={index}
          onClick={() => handleLogSelect(index)}
        >
          {!parsedLog ? (
            <PlainLog
              log={log}
              index={index}
              searchQuery={searchState.query}
              isCurrentMatch={isCurrentMatch}
            />
          ) : (
            <FormattedLog
              log={parsedLog}
              index={index}
              searchQuery={searchState.query}
              isCurrentMatch={isCurrentMatch}
            />
          )}
        </div>
      );
    });
  }, [logs, searchState.query, currentMatchLineIndex, handleLogSelect]);

  return (
    <FlexBox col>
      <LogSearch
        onSearch={handleSearch}
        onNavigate={handleNavigate}
        currentMatch={searchState.selectedIndex}
        totalMatches={searchState.elements.length}
      />
      {loading ? (
        <FlexBox alignCenter gap2>
          <CircularProgress size="20px" />
          <Line>Loading...</Line>
        </FlexBox>
      ) : (
        <FlexBox
          ref={containerRef}
          col
          sx={{ overflowY: 'auto', maxHeight: '100%', position: 'relative' }}
        >
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
            marginLeft: `calc(${
              containerRef.current
                ? containerRef.current.clientWidth / 2 - 67
                : 0
            }px)`,
            transform: 'rotate(180deg)'
          }}
          aria-label="Scroll to bottom"
        >
          <ExpandCircleDown fontSize="large" color="secondary" />
        </Button>
      )}

      {showScrollUpButton.value && (
        <Button
          onClick={scrollToTop}
          component={MotionBox}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            ease: 'easeOut'
          }}
          top={60}
          sx={{
            position: 'fixed',
            marginLeft: `calc(${
              containerRef.current
                ? containerRef.current.clientWidth / 2 - 67
                : 0
            }px)`
          }}
          aria-label="Scroll to top"
        >
          <ExpandCircleDown fontSize="large" color="secondary" />
        </Button>
      )}
    </FlexBox>
  );
});

export { SystemLogs };
