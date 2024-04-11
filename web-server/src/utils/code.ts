import { Row } from '@/constants/db';
import { Repo, GhRepo } from '@/types/github';
import { BaseRepo, PR } from '@/types/resources';

export const getKeyForPr = (pr: PR) => `${pr.number}/${pr.repo_name}`;

export const getBaseRepoFromUnionRepo = (repo: Partial<Repo>): BaseRepo => {
  const ghRepo = repo as GhRepo;

  return {
    id: ghRepo.id,
    name: repo.name,
    desc: repo.description,
    slug: ghRepo.name,
    parent: ghRepo.owner?.login,
    web_url: ghRepo.html_url,
    language: repo.language,
    branch: ghRepo.default_branch
  };
};

export const getCycleTimeForPr = (pr: PR) =>
  pr.first_response_time + pr.rework_time + pr.merge_time || 0;

export const getBaseRepoFromDBRepo = (dbRepo: Row<'OrgRepo'>): BaseRepo => ({
  branch: dbRepo.default_branch,
  language: dbRepo.language,
  desc: null,
  id: dbRepo.id,
  name: dbRepo.name,
  parent: dbRepo.org_name,
  slug: dbRepo.name,
  web_url: null
});
