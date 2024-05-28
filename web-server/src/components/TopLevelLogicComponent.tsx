import { FC } from 'react';

import { useImageUpdateStatusWorker } from '@/hooks/useImageUpdateStatusWorker';

export const TopLevelLogicComponent: FC = () => {
  useImageUpdateStatusWorker();
  return null;
};
