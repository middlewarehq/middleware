import { GhType, Github } from './octokit';

export type GhRepo = GhType<typeof Github.repos.listForOrg>[number];
export type Repo = GhRepo;

export type LoadedOrg = {
  name?: string;
  avatar_url: string;
  login: string;
  repos: string[];
  web_url: string;
};
