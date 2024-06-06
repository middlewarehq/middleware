import { execSync } from 'child_process';

const defaultBranch = 'main';

const fetchRemoteRepository = () => {
  try {
    execSync('git fetch origin');
  } catch (error) {
    console.error(`Error fetching the remote repository: ${error}`);
  }
};

const getLatestLocalCommitSHA = () => {
  fetchRemoteRepository();
  const commitSHA = execSync(`git rev-parse ${defaultBranch}`)
    .toString()
    .trim();
  return commitSHA;
};

export async function isLocalBranchBehindRemote(): Promise<string> {
  const latestLocalCommitSHA = getLatestLocalCommitSHA();

  const behindCommits = execSync(
    `git rev-list ${latestLocalCommitSHA}..origin/main`
  )
    .toString()
    .trim()
    .split('\n');

  const behindCommitsCount = behindCommits.filter((commit) => commit).length;

  if (behindCommitsCount == 0) {
    return '';
  }

  if (behindCommitsCount == 1) {
    return `(1 commit behind remote. pull and rebase)`;
  }

  return `(${behindCommitsCount} commits behind remote. pull and rebase)`;
}
