import { NextApiRequest } from 'next/types';
import { omit } from 'ramda';

import { getFlagsFromRequest } from '@/api-helpers/features';
import { ResponseError } from '@/constants/error';
import { ApiRequest } from '@/types/request';
import { isObj } from '@/utils/datatype';

export const parseError = (err: any) => {
  const status = err?.status || 400;
  const stack = err?.stack
    ? err.stack
        .split('\n')
        .map((line: string) =>
          line.includes('node_modules') ? '    <internal/redacted>' : line
        )
        .join('\n')
    : null;
  const payload = err?.data || err?.message || err;
  const dbErrorIfPresent = transformDBErrors(err);

  const response = {
    status,
    payload: dbErrorIfPresent
      ? dbErrorIfPresent
      : typeof payload === 'object'
      ? transformInternalApiErrors(payload) || payload
      : { message: payload }
  };

  if (stack) response.payload.stack = stack;
  if (err instanceof ResponseError || dbErrorIfPresent)
    delete response.payload.stack;

  return response;
};

export const isInternalError = (payload: Record<string, any>) =>
  typeof payload?.Code === 'string' && typeof payload?.Message === 'string';
const transformInternalApiErrors = (payload: Record<string, any>) => {
  if (!isObj(payload)) return null;
  if (!isInternalError(payload)) return null;

  return {
    _internal_forwarded: true,
    message: payload.Message,
    payload: omit(['Message', 'Code'], payload)
  };
};

export const isDbError = (err: any) =>
  err?.message?.startsWith('insert into') ||
  err?.code === '22P02' ||
  err?.internalQuery;
const transformDBErrors = (err: any) => {
  if (!isDbError(err)) return null;

  return {
    _db_error: true,
    message: "Error communicating with internal systems. We've been notified."
  };
};
const defaultPropDescriptors = {
  writable: true,
  enumerable: true,
  configurable: true
};
const deprecatedAccessWarningLog = (field: string) =>
  console.trace(
    `!! DEPRECATED PROPERTY ACCESS (field: ${field}): Use \`req.payload\` instead.`
  );

export const transformNextRequest = (req: NextApiRequest): ApiRequest => {
  const request = { ...req } as ApiRequest;
  request.headers = req.headers;

  const meta = getFlagsFromRequest(req);
  delete req.query?.feature_flags;

  Object.defineProperties(request, {
    payload: {
      value: {
        ...req.query,
        ...req.body
      },
      ...defaultPropDescriptors,
      writable: true
    },

    ___body: {
      value: req.body,
      ...defaultPropDescriptors
    },
    body: {
      get() {
        deprecatedAccessWarningLog('body');
        return this.___body;
      },
      set(val) {
        this.___body = val;
      }
    },

    ___query: {
      value: req.query,
      ...defaultPropDescriptors
    },
    query: {
      get() {
        deprecatedAccessWarningLog('query');
        return this.___query;
      },
      set(val) {
        this.___query = val;
      }
    }
  });

  request.meta = meta;

  mutableTransformRequestPayloadArrays(request);
  parseDataFromStringParams(request);

  return request;
};
const mutableTransformRequestPayloadArrays = (request: ApiRequest) => {
  for (let key in request.payload) {
    if (!key.endsWith('[]')) continue;
    const newKey = key.replace('[]', '');

    (request.payload as Record<string, any>)[newKey] = [
      (request.payload as Record<string, any>)[key]
    ].flat();
    delete (request.payload as Record<string, any>)[key];
  }
};
const parseDataFromStringParams = (request: ApiRequest) => {
  for (let key in request.payload) {
    try {
      (request.payload as Record<string, any>)[key] = JSON.parse(
        (request.payload as Record<string, any>)[key]
      );
    } catch {
      continue;
    }
  }
};
