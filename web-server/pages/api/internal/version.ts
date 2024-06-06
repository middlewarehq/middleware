import { Endpoint, nullSchema } from '@/api-helpers/global';
import axios from 'axios';

const dockerRepoName = 'middlewareeng/middleware';
const githubOrgName = 'middlewarehq';
const githubRepoName = 'middleware';

const endpoint = new Endpoint(nullSchema);

endpoint.handle.GET(nullSchema, async (req, res) => {
  return res.send(await checkNewImageRelease());
});

interface ProjectVersionInfo {
  merge_commit_sha: string;
  current_build_date: string;
}

interface CheckNewVersionResponse {
  latest_github_commit: string;
  latest_docker_image: string;
  github_repo: string;
  current_github_commit: string;
  is_update_available: boolean;
  latest_docker_image_build_date: Date;
}

interface DockerHubAPIResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: TagResult[];
}

interface TagResult {
  creator: number;
  id: number;
  images: DockerImage[];
  last_updated: string;
  last_updater: number;
  last_updater_username: string;
  name: string;
  repository: number;
  full_size: number;
  v2: boolean;
  tag_status: string;
  tag_last_pulled: string;
  tag_last_pushed: string;
  media_type: string;
  content_type: string;
  digest: string;
}

interface DockerImage {
  architecture: string;
  features: string;
  variant: string | null;
  digest: string;
  os: string;
  os_features: string;
  os_version: string | null;
  size: number;
  status: string;
  last_pulled: string | null;
  last_pushed: string;
}

interface TagCompressed {
  name: string;
  last_updated: string;
  digest: string;
}

interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
}

function getProjectVersionInfo(): ProjectVersionInfo {
  const merge_commit_sha = process.env.MERGE_COMMIT_SHA;
  const build_date = process.env.BUILD_DATE;

  return {
    merge_commit_sha: merge_commit_sha,
    current_build_date: build_date
  };
}

async function fetchDockerHubTags(): Promise<TagCompressed[]> {
  const dockerHubUrl = `https://hub.docker.com/v2/repositories/${dockerRepoName}/tags/`;
  const response = await axios.get<DockerHubAPIResponse>(dockerHubUrl);

  return response.data.results.map((tag) => ({
    name: tag.name,
    digest: tag.images[0].digest,
    last_updated: tag.last_updated
  }));
}

async function fetchLatestGitHubCommit(): Promise<GitHubCommit> {
  const apiUrl = `https://api.github.com/repos/${githubOrgName}/${githubRepoName}/commits`;
  const response = await axios.get<GitHubCommit[]>(apiUrl);
  const latestCommit = response.data[0];
  return latestCommit;
}

function isUpdateAvailable(
  localVersionInfo: ProjectVersionInfo,
  dockerLatestRemoteTag: TagCompressed,
  githubLatestCommit: GitHubCommit
): boolean {
  const env = process.env.NEXT_PUBLIC_APP_ENVIRONMENT;

  if (env == 'development') {
    const localBuildDate = new Date(localVersionInfo.current_build_date);
    const latestRemoteCommitDate = new Date(
      githubLatestCommit.commit.author.date
    );

    console.log(latestRemoteCommitDate);
    return latestRemoteCommitDate > localBuildDate;
  } else {
    const localBuildDate = new Date(localVersionInfo.current_build_date);
    const latestRemoteDate = new Date(dockerLatestRemoteTag.last_updated);
    return latestRemoteDate > localBuildDate;
  }
}

async function checkNewImageRelease(): Promise<CheckNewVersionResponse> {
  const versionInfo = getProjectVersionInfo();

  const dockerRemoteTags = await fetchDockerHubTags();
  const githubLatestCommit = await fetchLatestGitHubCommit();

  dockerRemoteTags.sort(
    (a, b) =>
      new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()
  );
  const latestTag = dockerRemoteTags[0];
  const latestRemoteDate = new Date(latestTag.last_updated);

  const latestDockerImageLink = `https://hub.docker.com/layers/${dockerRepoName}/${latestTag.name}/images/${latestTag.digest}`;

  const githubRepLink = `https://github.com/${githubOrgName}/${githubRepoName}`;

  return {
    latest_github_commit: githubLatestCommit.sha,
    latest_docker_image: latestDockerImageLink,
    github_repo: githubRepLink,
    current_github_commit: versionInfo.merge_commit_sha,
    is_update_available: isUpdateAvailable(
      versionInfo,
      latestTag,
      githubLatestCommit
    ),
    latest_docker_image_build_date: latestRemoteDate
  };
}

export default endpoint.serve();
