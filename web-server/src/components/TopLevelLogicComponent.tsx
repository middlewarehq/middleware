import { FC } from 'react';

import { useImageUpdateStatusWorker } from '@/hooks/useImageUpdateStatusWorker';
import { useDispatch } from 'react-redux';
import { getGithubRepoStars } from '@/slices/app';

export const TopLevelLogicComponent: FC = () => {
  const dispatch = useDispatch();
  dispatch(getGithubRepoStars());
  useImageUpdateStatusWorker();
  return null;
};
