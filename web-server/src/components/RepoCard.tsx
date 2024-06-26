import { DataObjectRounded } from '@mui/icons-material';
import { Typography, styled } from '@mui/material';

import GitBranch from '@/assets/git-merge-line.svg';
import { Repo } from '@/types/github';
import { DB_OrgRepo } from '@/types/resources';

export const RepoTitle = styled(Typography)(() => ({
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  display: 'block',
  cursor: 'pointer'
}));

export const RepoDescription = styled(Typography)(() => ({
  width: '100%',
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  display: 'block'
}));

export const RepoLangIcon = styled(DataObjectRounded)(({ theme }) => ({
  marginLeft: theme.spacing(-1 / 4),
  marginRight: theme.spacing(1 / 2),
  opacity: 0.8,
  height: '0.7em',
  width: '0.7em'
}));

export const GitBranchIcon = styled(GitBranch)(({ theme }) => ({
  marginRight: theme.spacing(0.5),
  opacity: 0.8,
  height: '1.5em',
  width: '1.5em'
}));

export const adaptDbRepo = (repo: DB_OrgRepo): Partial<Repo> => ({
  name: repo.name,
  html_url: `//${repo.provider}.com/${repo.org_name}/${repo.name}`,
  language: repo.language,
  default_branch: repo.default_branch
});
