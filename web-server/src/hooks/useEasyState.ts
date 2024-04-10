import {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useRef,
  useState
} from 'react';

export const useBoolState = (defaultValue: boolean = false) => {
  const [value, set] = useState(defaultValue);
  const valueRef = useRef<boolean>(defaultValue);
  valueRef.current = value;
  const [defaultState] = useState(defaultValue);

  const _true = useCallback(() => set(true), []);
  const _false = useCallback(() => set(false), []);
  const toggle = useCallback(() => set((value) => !value), []);
  const trackAsync = useCallback(
    async <T extends AnyAsyncFunction>(
      asyncFn: T
    ): Promise<Awaited<ReturnType<T>>> => {
      set(true);
      const response = await asyncFn().finally(() => set(false));
      return response;
    },
    []
  );

  return useMemo(
    () => ({
      value,
      valueRef,
      set,
      toggle,
      true: _true,
      false: _false,
      trackAsync,
      initial: defaultState
    }),
    [_false, _true, defaultState, toggle, trackAsync, value]
  );
};

export type BoolState = ReturnType<typeof useBoolState>;

export const useEasyState = <T = any>(defaultValue?: T) => {
  const [value, _set] = useState<T>(defaultValue);
  const valueRef = useRef<T>(defaultValue);
  valueRef.current = value;
  const [defaultState] = useState(defaultValue);
  const [touched, setTouched] = useState(false);
  const [dirty, setDirty] = useState(false);

  const set: Dispatch<SetStateAction<T>> = useCallback((...args) => {
    _set(...args);
    setDirty(true);
    setTouched(true);
  }, []);

  const eventHandler = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => set((e?.target?.value as any) || ''),
    [set]
  );
  const reset = useCallback(() => {
    setDirty(false);
    set(defaultState);
  }, [defaultState, set]);

  const clear = useCallback(() => {
    if (Array.isArray(defaultState)) return set([] as any);
    if (defaultState === null || defaultState === undefined)
      return set(defaultState);
    if (defaultState instanceof Date) return set(null);

    switch (typeof defaultState) {
      case 'boolean':
        return set(false as any);
      case 'number':
        return set(0 as any);
      case 'string':
        return set('' as any);
      case 'object':
        return set({} as any);
      default:
        return set(defaultState);
    }
  }, [defaultState, set]);

  return useMemo(
    () => ({
      value,
      valueRef,
      set,
      eventHandler,
      initial: defaultState,
      reset,
      clear,
      touched,
      dirty
    }),
    [clear, defaultState, dirty, eventHandler, reset, set, touched, value]
  );
};

export type EasyState<T> = ReturnType<typeof useEasyState<T>>;

export const DEFAULT_EASY_STATE = <T>(val: T): EasyState<T> => ({
  value: val,
  valueRef: { current: val },
  set: () => {},
  eventHandler: () => {},
  initial: val,
  reset: () => {},
  clear: () => {},
  touched: false,
  dirty: false
});
