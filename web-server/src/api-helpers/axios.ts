import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import axiosRetry, { isNetworkOrIdempotentRequestError } from 'axios-retry';
import { last } from 'ramda';

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

export const handleRequest = <T = any>(
  url: string,
  params: AxiosRequestConfig<any> = { method: 'get' }
): Promise<T> =>
  internal({
    url,
    ...params,
    headers: { 'Content-Type': 'application/json' }
  })
    .then(handleThen)
    .catch(handleCatch);

export const handleThen = (r: AxiosResponse) => r.data;
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

export const getServerStatusCode = async (
  url: string,
  params: AxiosRequestConfig<any> = { method: 'get' }
): Promise<number> => {
  try {
    const response = await internal({
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

export const getSyncServerStatusCode = async (
  url: string,
  params: AxiosRequestConfig<any> = { method: 'get' }
): Promise<number> => {
  try {
    const response = await internalSyncServer({
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
