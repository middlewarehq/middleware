import { Features } from '@/constants/feature';

import type { NextApiRequest, NextApiResponse } from 'next/types';

export type HttpMethods =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'OPTIONS'
  | 'HEAD';

export type ApiRequest<T = {}> = Omit<
  NextApiRequest,
  'body' | 'query' | 'method'
> & {
  /** @deprecated Use `req.payload` instead */
  body: T;
  /** @deprecated Use `req.payload` instead */
  query: T;
  payload: T;
  meta?: {
    features: Partial<Features>;
  };
  method: HttpMethods;
};

export type ApiResponse = NextApiResponse;
