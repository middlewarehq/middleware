import { differenceInMilliseconds } from 'date-fns';
import { millisecondsInSecond } from 'date-fns/constants';
import { useEffect, useRef } from 'react';

import { Errors } from '@/constants/error';

import { useBoolState } from './useEasyState';
import { usePrevious } from './usePrevious';

/**
 * This hook accepts an arg that will be compared between renders,
 * and will throw an error if the component updates more than a
 * specified number of times within a second.
 * @param arg anything that you want to compare between renders
 * @param count upper limit on number of times the comparison is allowed to fail per sec
 */
export const useFrequentUpdateProtection = (arg: any, count = 50) => {
  const prevArg = usePrevious(arg);
  const failCount = useRef(0);
  const firstFailTime = useRef(new Date());
  const failed = useBoolState(false);
  useEffect(() => {
    // If already failed, or arg didn't change, do nothing
    if (failed.value || arg === prevArg) return;

    if (failCount.current >= count - 1) {
      if (
        Math.abs(differenceInMilliseconds(firstFailTime.current, new Date())) >
        millisecondsInSecond
      ) {
        failCount.current = 0;
      }
      failed.true();

      if (process.env.NEXT_PUBLIC_APP_ENVIRONMENT === 'development') {
        throw new Error(Errors.EXCEEDED_UPDATE_THRESHOLD);
      }
    } else {
      if (!failCount.current) firstFailTime.current = new Date();
      failCount.current++;
    }
  }, [arg, count, failed, prevArg]);
};
