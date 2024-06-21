import { FC, useEffect, useRef } from 'react';

import { appSlice } from '@/slices/app';
import { useDispatch } from '@/store';
import { ImageStatusApiResponse } from '@/types/resources';

type WorkerResponse = {
  data?: ImageStatusApiResponse;
  error?: string | null;
};

const IMAGE_UPDATE_STATUS_API_URL = '/api/internal/version';
const IMAGE_UPDATE_STATUS_API_POLLING_INTERVAL = 6_00_000;

export const useImageUpdateStatusWorker = (): void => {
  const dispatch = useDispatch();
  const workerRef = useRef<Worker | null>(null);
  useEffect(() => {
    if (typeof Worker === 'undefined') return;
    const createWorker = async () => {
      workerRef.current = new Worker('/imageStatusApiWorker.js');
      workerRef.current.addEventListener(
        'message',
        (event: MessageEvent<WorkerResponse>) => {
          const { data, error } = event.data;
          if (error) {
            return;
          } else {
            dispatch(appSlice.actions.setLatestImageStatus(data));
          }
        }
      );

      workerRef.current.postMessage({
        apiUrl: IMAGE_UPDATE_STATUS_API_URL,
        interval: IMAGE_UPDATE_STATUS_API_POLLING_INTERVAL
      });
    };

    createWorker();

    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage('stop');
        workerRef.current.terminate();
      }
    };
  }, [dispatch]);

  return null;
};
