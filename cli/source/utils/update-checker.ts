import axios from 'axios';
import { execSync } from 'child_process';

const githubOrgName = 'middlewarehq';
const githubRepoName = 'middleware';
const defaultBranch = 'main';

type GitHubCommit = {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
};

const getLatestCommitTimestamp = () => {
  const commitSHA = execSync(`git rev-parse ${defaultBranch}`)
    .toString()
    .trim();
  const commitTimestamp = execSync(`git show -s --format=%cI ${commitSHA}`)
    .toString()
    .trim();
  return commitTimestamp;
};

async function fetchLatestGitHubCommit(): Promise<GitHubCommit | undefined> {
  const apiUrl = `https://api.github.com/repos/${githubOrgName}/${githubRepoName}/commits/${defaultBranch}`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    console.error(`Error fetching commit data: ${response.statusText}`);
    return undefined;
  }

  const data: GitHubCommit = await response.json();
  return data;
}

export async function isLocalBranchBehindRemote(): Promise<Boolean> {
  const commitTimestamp = getLatestCommitTimestamp();
  const latestGithubCommit = await fetchLatestGitHubCommit();

  if (!latestGithubCommit) {
    return true;
  }

  const localCommitTimestamp = new Date(commitTimestamp);
  const latestRemoteCommitDate = new Date(
    latestGithubCommit.commit.author.date
  );

  return latestRemoteCommitDate > localCommitTimestamp;
}
