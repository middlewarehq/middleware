import { useRef, useEffect, MutableRefObject } from 'react';

export const usePrevious = <T>(value: T): T => {
  const ref: MutableRefObject<T> = useRef<T>();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
};
