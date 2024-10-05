import { FC, useEffect } from 'react';

import { useImageUpdateStatusWorker } from '@/hooks/useImageUpdateStatusWorker';
import { getGithubRepoStars } from '@/slices/app';
import { useDispatch } from '@/store';

export const TopLevelLogicComponent: FC = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getGithubRepoStars());
  }, [dispatch, getGithubRepoStars]);

  useImageUpdateStatusWorker();

  return null;
};
