import { omit } from 'ramda';
import { createContext, useCallback, useContext } from 'react';

import { PERSISTED_FLAG_KEY } from '@/constants/api';
import { storage } from '@/utils/storage';

import { useEasyState } from './useEasyState';

import { Features, defaultFlags } from '../constants/feature';

export { defaultFlags };

export class FlagOverride {
  static all = (): Partial<Features> => storage.get(PERSISTED_FLAG_KEY) || {};
  static get = <T extends keyof Features>(flag: T): Features[T] =>
    storage.get(PERSISTED_FLAG_KEY)?.[flag];
  static set = (flag: keyof Features, value: boolean) =>
    storage.set(PERSISTED_FLAG_KEY, { ...FlagOverride.all(), [flag]: value });
  static remove = (flag: keyof Features) =>
    storage.set(PERSISTED_FLAG_KEY, omit([flag], FlagOverride.all()));
}

export const useFlagOverrides = () => {
  const overrides = useEasyState(FlagOverride.all());
  const setOverrides = overrides.set;

  const set = useCallback(
    (flag: keyof Features, value: boolean = false) => {
      FlagOverride.set(flag, value);
      setOverrides(FlagOverride.all());
    },
    [setOverrides]
  );

  const remove = useCallback(
    (flag: keyof Features) => {
      FlagOverride.remove(flag);
      setOverrides(FlagOverride.all());
    },
    [setOverrides]
  );

  return {
    flags: overrides.value,
    set,
    remove
  };
};

export const FeatureFlagsContext = createContext<{
  flags: Features;
  overrides: ReturnType<typeof useFlagOverrides>;
}>({
  flags: defaultFlags,
  overrides: {
    flags: defaultFlags,
    set: FlagOverride.set,
    remove: FlagOverride.remove
  }
});

export const useFeature = <T extends keyof Features>(
  feature: T
): Features[T] => {
  const { flags } = useContext(FeatureFlagsContext);
  const value =
    FlagOverride.get<T>(feature) ?? flags?.[feature] ?? defaultFlags[feature];

  // In case the default value is function-based, return a function
  // to avoid modifying the point of usage
  if (
    typeof defaultFlags[feature] === 'function' &&
    typeof value !== 'function'
  )
    // @ts-ignore
    return () => value;

  return (
    FlagOverride.get<T>(feature) ?? flags?.[feature] ?? defaultFlags[feature]
  );
};
