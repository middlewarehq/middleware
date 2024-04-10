import { useRouter } from 'next/router';
import { useMemo } from 'react';

import { TrackEvents } from '@/constants/events';
import { ROUTES } from '@/constants/routes';

type AllowedEventTypes = 'APP_TEAM_CHANGE_SINGLE' | 'APP_DATE_RANGE_CHANGED';

// Please sync event names in events.ts too while updating below map
const FEATURE_EVENT_PREFIX_MAP = {
  [ROUTES.DORA_METRICS.PATH]: 'DORA_METRICS'
};

export const useActiveRouteEvent = (
  appEventType: AllowedEventTypes
): keyof typeof TrackEvents => {
  const router = useRouter();
  const activePath = router.pathname;
  return useMemo(
    () =>
      (FEATURE_EVENT_PREFIX_MAP[activePath]
        ? FEATURE_EVENT_PREFIX_MAP[activePath] + appEventType.split('APP')[1]
        : appEventType) as keyof typeof TrackEvents,
    [activePath, appEventType]
  );
};
