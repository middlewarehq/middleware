import { FC } from 'react';
import { useDispatch } from '@/store';
import { getGithubRepoStars } from '@/slices/app';
import { useImageUpdateStatusWorker } from '@/hooks/useImageUpdateStatusWorker';

export const TopLevelLogicComponent: FC = () => {
  const dispatch = useDispatch();
  dispatch(getGithubRepoStars());
  useImageUpdateStatusWorker();
  return null;
};
