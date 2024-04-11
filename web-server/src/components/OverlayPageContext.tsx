import { AnimatePresence } from 'framer-motion';
import { NextRouter, useRouter } from 'next/router';
import { mergeDeepRight, omit, update } from 'ramda';
import {
  createContext,
  FC,
  useCallback,
  useContext,
  useMemo,
  useRef
} from 'react';

import { track } from '@/constants/events';

import { OverlayPageItem, OverlayPage } from './OverlayPage';

type OverlayPageCtxT = {
  addPage: (p: OverlayPageItem) => any;
  upsertPage: (p: OverlayPageItem) => void;
  goBack: () => any;
  removeAll: () => any;
};

const ctxDefaults: OverlayPageCtxT = {
  addPage: () => {},
  upsertPage: () => {},
  goBack: () => {},
  removeAll: () => {}
};

const OverlayPageCtx = createContext<OverlayPageCtxT>(ctxDefaults);

const safeJSON = (str: string) => {
  try {
    return JSON.parse(str);
  } catch {}
};

const parseOverlayParam = (query: string) => {
  const parsedOverlays = safeJSON(query as string);
  return (Array.isArray(parsedOverlays)
    ? parsedOverlays
    : []) as unknown as OverlayPageItem[];
};

export const OverlayPageProvider: FC = ({ children }) => {
  const router = useRouter();
  const overlaysQuery = router.query.overlays as string;

  const overlays = useMemo(
    () => parseOverlayParam(overlaysQuery as string),
    [overlaysQuery]
  );

  const overlaysRef = useRef<OverlayPageItem[]>([]);
  overlaysRef.current = overlays;
  const routerRef = useRef<NextRouter>(router);
  routerRef.current = router;

  const addPage = useCallback((p: OverlayPageItem) => {
    const hasExistingPageWithSameUi = overlaysRef.current.find(
      (page) => page.page?.ui === p.page?.ui
    );

    if (hasExistingPageWithSameUi) {
      track('OVERLAY_ADD_PAGE_IGNORED', {
        page: p,
        existing_pages: overlaysRef.current
      });
      return;
    }

    track('OVERLAY_ADD_PAGE', { page: p });
    routerRef.current.push({
      query: {
        ...routerRef.current.query,
        overlays: JSON.stringify(overlaysRef.current.concat(p))
      }
    });
  }, []);

  const upsertPage = useCallback((p: OverlayPageItem) => {
    track('OVERLAY_UPDATE_PAGE', { page: p });
    let overlays = overlaysRef.current;
    const overlayIndex = overlays.findIndex((o) => o.page.ui);
    const overlay = overlays[overlayIndex];

    if (overlayIndex > -1)
      overlays = update(overlayIndex, mergeDeepRight(overlay, p), overlays);
    else overlays = overlays.concat(p);

    routerRef.current.push({
      query: {
        ...routerRef.current.query,
        overlays: JSON.stringify(overlays)
      }
    });
  }, []);

  const goBack = useCallback(() => {
    track('OVERLAY_REMOVE_PAGE');
    const updatedOverlays = overlaysRef.current.slice(0, -1);
    routerRef.current.push({
      query: updatedOverlays.length
        ? {
            ...routerRef.current.query,
            overlays: JSON.stringify(updatedOverlays)
          }
        : omit(['overlays'], routerRef.current.query)
    });
  }, []);

  const removeAll = useCallback(() => {
    track('OVERLAY_REMOVE_ALL_PAGES');
    routerRef.current.push({
      query: omit(['overlays'], routerRef.current.query)
    });
  }, []);

  return (
    <OverlayPageCtx.Provider value={{ addPage, upsertPage, goBack, removeAll }}>
      <AnimatePresence>
        {overlays.map((page, i) => (
          <OverlayPage
            key={page.id || i}
            id={page.id || i}
            page={page.page}
            index={i}
          />
        ))}
      </AnimatePresence>
      {children}
    </OverlayPageCtx.Provider>
  );
};

export const useOverlayPage = () => {
  return useContext(OverlayPageCtx);
};
