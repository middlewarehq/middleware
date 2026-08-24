import { AxiosError } from 'axios';

import { ResponseError } from '@/constants/error';

/**
 * CLUSTOX: re-throws an analytics-server failure with the server's own status
 * and message.
 *
 * The BFF's generic error path (parseError) reads `message` off whatever was
 * thrown, and for an axios failure that string is always "Request failed with
 * status code 409" -- the server's explanation never reaches the browser, so
 * every failure arrives looking identical. Jenkins depends on the difference:
 * a 400 naming a base URL this server refuses to fetch and a 409 naming the
 * workflow already holding a job id are both things only an admin can fix, and
 * both read as "try again" without the text.
 */
export const forwardInternalError = (err: unknown): never => {
  const response = (err as AxiosError<{ error?: string }>)?.response;
  const message = response?.data?.error;

  // A timeout, a refused connection or an HTML error page carries nothing
  // worth showing, so it keeps the generic 400/500 handling rather than
  // surfacing a fragment of someone else's stack trace to an admin.
  if (response?.status && typeof message === 'string' && message)
    throw new ResponseError(message, response.status);

  throw err;
};
