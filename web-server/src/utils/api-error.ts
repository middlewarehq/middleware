import { AxiosResponse } from 'axios';

/**
 * CLUSTOX: reads the status and message off a rejected `handleApi` call.
 *
 * `handleApi` rejects with the AxiosResponse itself rather than an Error, and
 * the BFF's error body is `{ message }` (see parseError). Both facts are easy
 * to get wrong at each call site, and getting them wrong degrades silently to
 * "no message", which is exactly the generic advice a caller reaching for this
 * is trying to avoid.
 */
export const readApiError = (
  err: unknown
): { status: number | null; message: string | null } => {
  const response = err as AxiosResponse<{ message?: string }> | undefined;
  const message = response?.data?.message;

  return {
    status: typeof response?.status === 'number' ? response.status : null,
    message: typeof message === 'string' && message ? message : null
  };
};
