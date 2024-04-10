import {
  AxiosError,
  AxiosPromise,
  AxiosRequestConfig,
  AxiosResponse
} from 'axios';
import useAxiosHook, { configure, Options, RefetchOptions } from 'axios-hooks';
import { useSnackbar } from 'notistack';
import {
  MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import { api } from '@/api-helpers/axios-api-instance';
import {
  InternalAPIErrors,
  ForwardableErrors,
  ForwardableWarnings
} from '@/constants/error';
import { track } from '@/constants/events';
import { FetchState } from '@/constants/ui-states';
import { appSlice } from '@/slices/app';
import { useDispatch } from '@/store';

import { useFrequentUpdateProtection } from './useFrequentUpdateProtection';
import { usePrevious } from './usePrevious';

configure({ axios: api });

type ExtendedOptions<TResponse, TBody> = {
  onSuccess?: (response: AxiosResponse<TResponse, TBody>) => any;
  onError?: (response: AxiosError) => any;
} & Options;

type UseAxiosReturnType<TResponse, TBody, TError> = [
  TResponse,
  {
    loading: boolean;
    error: AxiosError<TError, TBody>;
    response: AxiosResponse<TResponse, TBody>;
    fetch_state: FetchState;
    fetch: (
      config?: AxiosRequestConfig<TBody> | string,
      options?: RefetchOptions
    ) => AxiosPromise<TResponse>;
    cancel: () => void;
    requestCount: MutableRefObject<number>;
  }
];

export const useAxios = <
  TResponse = any,
  TBody = any,
  TError = { message: string }
>(
  config: string | AxiosRequestConfig<TBody>,
  { onSuccess, onError, ...options }: ExtendedOptions<TResponse, TBody> = {}
): UseAxiosReturnType<TResponse, TBody, TError> => {
  const { enqueueSnackbar } = useSnackbar();

  const [{ data, loading, error, response }, refetch, cancel] = useAxiosHook<
    TResponse,
    TBody,
    TError
  >(config, options);

  const errMessage = getErrMsg(error);
  if (error) error.message = errMessage;

  const dispatch = useDispatch();
  const [fetch_state, setFetchState] = useState(FetchState.DORMANT);

  const requestCount = useRef(0);
  const prevLoading = usePrevious(loading);
  useEffect(() => {
    if (loading && prevLoading !== loading) requestCount.current += 1;
  }, [loading, prevLoading]);

  useEffect(() => {
    if (!errMessage || onError) return;

    if (ForwardableErrors.has(errMessage)) {
      enqueueSnackbar(errMessage, { variant: 'error', autoHideDuration: 4000 });
    } else if (ForwardableWarnings.has(errMessage)) {
      enqueueSnackbar(errMessage, {
        variant: 'warning',
        autoHideDuration: 4000
      });
    } else if (!InternalAPIErrors[errMessage]) {
      const errId = btoa(errMessage || '').slice(0, 10);
      track('ERR_TOAST_SHOWN', { error_message: errMessage, err_id: errId });
      enqueueSnackbar(
        `Something went wrong. We are working on it. ID: ${errId}`,
        { variant: 'error', autoHideDuration: 4000 }
      );
    }

    switch (errMessage) {
      case InternalAPIErrors['Bad credentials']:
      case InternalAPIErrors.ORG_TREE_NOT_FOUND:
      case InternalAPIErrors.GOOGLE_TOKEN_EXPIRED:
      case InternalAPIErrors.GOOGLE_TOKEN_NOT_FOUND:
      case InternalAPIErrors.JIRA_TOKEN_EXPIRED:
      case InternalAPIErrors.JIRA_TOKEN_NOT_FOUND:
      case InternalAPIErrors.JIRA_TOKEN_EXPIRED:
      case InternalAPIErrors.JIRA_TOKEN_NOT_FOUND: {
        dispatch(appSlice.actions.setErrors({ [errMessage]: {} }));
        break;
      }
    }
  }, [dispatch, enqueueSnackbar, errMessage, onError]);

  useFrequentUpdateProtection(onSuccess);
  useFrequentUpdateProtection(onError);

  const fetch = useCallback(
    async (...args) => {
      try {
        const response = await refetch(...args);
        onSuccess?.(response);
        return Promise.resolve(response);
      } catch (err: any) {
        onError?.(err);
        if (InternalAPIErrors[getErrMsg(err)]) return err;
        return Promise.reject(err);
      }
    },
    [onError, onSuccess, refetch]
  );

  useEffect(() => {
    if (loading)
      return setFetchState(
        requestCount.current > 0 ? FetchState.RETRIAL : FetchState.REQUEST
      );
    if (error) return setFetchState(FetchState.FAILURE);
    if (data) return setFetchState(FetchState.SUCCESS);
    return setFetchState(FetchState.DORMANT);
  }, [data, error, loading]);

  return useMemo(
    () => [
      data,
      { loading, error, response, fetch, cancel, fetch_state, requestCount }
    ],
    [data, loading, error, response, fetch, cancel, fetch_state]
  );
};

const getErrMsg = (error: any): InternalAPIErrors | null =>
  error?.response?.data?.message || error?.message || null;
