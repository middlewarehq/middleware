import { useEffect, useRef } from 'react';

import { track } from '@/constants/events';

export const useResizeEventTracking = () => {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const listener = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => track('WINDOW_RESIZE'), 1000);
    };

    window.addEventListener('resize', listener);

    return () => {
      window.removeEventListener('resize', listener);
    };
  }, []);
};
