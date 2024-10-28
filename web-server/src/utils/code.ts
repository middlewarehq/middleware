import { PR } from '@/types/resources';

export const getKeyForPr = (pr: PR) => `${pr.number}/${pr.repo_name}`;

export const getCycleTimeForPr = (pr: PR) =>
  pr.first_response_time + pr.rework_time + pr.merge_time || 0;
