import axios, { AxiosPromise, AxiosRequestConfig, AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';

import { loggerInterceptor } from '@/api-helpers/axios';

const _api = axios.create({
  baseURL: '/api'
});

const browserInterceptor = loggerInterceptor('browser');
_api.interceptors.request.use(browserInterceptor);

export const api = _api;
axiosRetry(api, { retries: 2 });
axiosRetry(axios, { retries: 2 });

export const handleApiRaw = <T = any>(
  url: string,
  params: AxiosRequestConfig<any> = { method: 'get' }
): AxiosPromise<T> =>
  api({
    url,
    ...params
  });

export const handleApi = <T = any>(
  url: string,
  params: AxiosRequestConfig<any> = { method: 'get' }
): Promise<T> =>
  handleApiRaw(url, {
    ...params,
    headers: { 'Content-Type': 'application/json' }
  })
    .then(handleThen)
    .catch(handleCatch);

export const handleThen = (r: AxiosResponse) => r.data;
export const handleCatch = (r: { response: AxiosResponse }) => {
  throw r.response;
};
