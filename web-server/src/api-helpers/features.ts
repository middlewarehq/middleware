import { NextRequest } from 'next/server';
import { NextApiRequest } from 'next/types';

import { PERSISTED_FLAG_KEY } from '@/constants/api';
import { Features } from '@/constants/feature';
import { ApiRequest } from '@/types/request';

export const getFeaturesFromReq = (
  request: NextRequest | NextApiRequest
): Features => {
  const cookie =
    (request as NextRequest).cookies.get?.(PERSISTED_FLAG_KEY)?.value ||
    (request as NextApiRequest).cookies[PERSISTED_FLAG_KEY] ||
    '{}';

  return typeof cookie === 'string' ? JSON.parse(cookie) : cookie;
};

export const getFlagsFromRequest = (
  req: NextApiRequest
): ApiRequest['meta'] => {
  if (!req.query?.feature_flags) return undefined;
  return {
    features: JSON.parse(req.query.feature_flags as string)
  };
};
