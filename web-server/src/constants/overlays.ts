import { lazy } from 'react';

export const overlaysImportMap = {
  dummy: lazy(() =>
    import('@/components/OverlayComponents/Dummy').then((c) => ({
      default: c.Dummy
    }))
  )
};
