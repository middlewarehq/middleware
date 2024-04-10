import { useCallback, useEffect, useRef } from 'react';

export const useRefMounted = () => {
  const isRef = useRef(false);

  useEffect(() => {
    isRef.current = true;

    return () => {
      isRef.current = false;
    };
  }, []);

  return useCallback(() => isRef.current, []);
};
