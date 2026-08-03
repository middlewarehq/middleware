import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import axiosRetry, { isNetworkOrIdempotentRequestError } from 'axios-retry';
import { last, mapObjIndexed } from 'ramda';

import { isObj } from '@/utils/datatype';
import { isoDateString } from '@/utils/date';

axios.defaults.paramsSerializer = {
  ...axios.defaults.paramsSerializer,
  serialize: (args) => {
    const processedArgs = mapObjIndexed((val) => {
      try {
        if (Array.isArray(val)) return JSON.stringify(val);
        if (val.constructor === Date) return isoDateString(val);
        if (isObj(val)) return JSON.stringify(val);
      } catch {}
      return val;
    }, args);
    const filteredArgs = Object.fromEntries(
      Object.entries(processedArgs).filter(([_, v]) => v !== undefined)
    );
    return new URLSearchParams(filteredArgs).toString();
  }
};

export const internal = axios.create({
  baseURL: process.env.INTERNAL_API_BASE_URL
});

export const internalSyncServer = axios.create({
  baseURL: process.env.INTERNAL_SYNC_API_BASE_URL
});

axiosRetry(internal, {
  retries: 2,
  retryCondition(error) {
    try {
      const isAGetMethodMasqueradingAsAPost =
        error?.config?.method?.toUpperCase?.() === 'POST' &&
        error.response.status >= 500 &&
        error?.config?.url?.includes('/fetch/');
      return (
        isNetworkOrIdempotentRequestError(error) ||
        isAGetMethodMasqueradingAsAPost
      );
    } catch {
      return false;
    }
  }
});

export const loggerInterceptor: (
  source: 'browser' | 'bff'
) => Parameters<typeof internal.interceptors.request.use>[0] =
  (source) => (req) => {
    const isBff = source === 'bff';
    const urlWithoutBase = req.url.startsWith('/') ? req.url : `/${req.url}`;
    const url = new URL(
      req.baseURL + urlWithoutBase,
      isBff ? undefined : `${window.location.protocol}//${window.location.host}`
    );

    if (req.params)
      Object.entries(req.params).map(([key, value]) =>
        url.searchParams.set(
          key,
          typeof value === 'string' ? value : JSON.stringify(value)
        )
      );

    const method = req.method?.toUpperCase() || 'UNKNOWN??';

    const message = isBff
      ? `[🌐] ${method} /${last(url.pathname.split('/'))} URL: ${url.href}`
      : `[🖥️] ${method} /${url.pathname} URL: ${url.href}`;

    console.info(message);

    return req;
  };

const bffInterceptor = loggerInterceptor('bff');

internal.interceptors.request.use(bffInterceptor);

export const handleRequest = <T = any, B extends boolean = false>(
  url: string,
  params: AxiosRequestConfig<any> = { method: 'get' },
  includeHeaders: B = false as B
): Promise<B extends true ? { data: T; headers: any } : T> =>
  internal({
    url,
    ...params,
    headers: { 
      'Content-Type': 'application/json',
      ...params.headers 
    }
  })
    .then((r: any) => handleThen(r, includeHeaders))
    .catch(handleCatch);

export const handleThen = <T = any, B extends boolean = false>(
  r: AxiosResponse<T>,
  includeHeaders: B = false as B
): B extends true ? { data: T; headers: any } : T => 
  (includeHeaders ? { data: r.data, headers: r.headers } : r.data) as any;

export const handleCatch = (r: { response: AxiosResponse }) => {
  throw r.response;
};

export const handleSyncServerRequest = <T = any>(
  url: string,
  params: AxiosRequestConfig<any> = { method: 'get' }
): Promise<T> =>
  internalSyncServer({
    url,
    ...params,
    headers: { 'Content-Type': 'application/json' }
  })
    .then(handleThen)
    .catch(handleCatch);

const getStatusCode = async (
  url: string,
  params: AxiosRequestConfig<any> = { method: 'get' },
  server: 'internal' | 'sync' = 'internal'
): Promise<number> => {
  const instance = server === 'internal' ? internal : internalSyncServer;

  try {
    const response = await instance({
      url,
      ...params,
      headers: { 'Content-Type': 'application/json' }
    });
    return response.status;
  } catch (error: any) {
    if (error.response) {
      return error.response.status;
    }
    throw error;
  }
};

export const getServerStatusCode = (
  url: string,
  params?: AxiosRequestConfig<any>
) => getStatusCode(url, params, 'internal');

export const getSyncServerStatusCode = (
  url: string,
  params?: AxiosRequestConfig<any>
) => getStatusCode(url, params, 'sync');
