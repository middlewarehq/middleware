import axios from 'axios';

import { Endpoint, nullSchema } from '@/api-helpers/global';

const dockerRepoName = 'middlewareeng/middleware';
const githubOrgName = 'middlewarehq';
const githubRepoName = 'middleware';
const latestTagName = 'latest';

const endpoint = new Endpoint(nullSchema);

endpoint.handle.GET(nullSchema, async (_req, res) => {
  return res.send(await checkNewImageRelease());
});

type ProjectVersionInfo = {
  merge_commit_sha: string;
  current_build_date: string;
};

type CheckNewVersionResponse = {
  latest_docker_image: string;
  github_repo: string;
  current_github_commit: string;
  is_update_available: boolean;
  latest_docker_image_build_date: Date;
  current_docker_image_build_date: Date;
};

type TagResult = {
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
};

type DockerImage = {
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
};

type TagCompressed = {
  name: string;
  last_updated: string;
  digest?: string;
};

function getProjectVersionInfo(): ProjectVersionInfo {
  const merge_commit_sha = process.env.MERGE_COMMIT_SHA;
  const build_date = process.env.BUILD_DATE;

  return {
    merge_commit_sha: merge_commit_sha,
    current_build_date: build_date
  };
}

async function fetchDockerHubLatestTag(): Promise<TagCompressed> {
  const latestTagUrl = `https://hub.docker.com/v2/repositories/${dockerRepoName}/tags/${latestTagName}`;
  const latestTag = (await axios.get<TagResult>(latestTagUrl)).data;

  const amdArchImage = latestTag.images.find((i) => i.architecture === 'amd64');

  return {
    name: latestTag.name,
    digest: amdArchImage?.digest,
    last_updated: latestTag.last_updated
  };
}

function isUpdateAvailable({
  localVersionInfo,
  dockerLatestRemoteTag
}: {
  localVersionInfo: ProjectVersionInfo;
  dockerLatestRemoteTag: TagCompressed;
}): boolean {
  const estimatesBuildTimeInMs: number = 30 * 60 * 1000;

  const env = process.env.NEXT_PUBLIC_APP_ENVIRONMENT;

  if (env == 'development') {
    const behindCommitsCount = process.env.BEHIND_COMMITS_COUNT
      ? Number(process.env.BEHIND_COMMITS_COUNT)
      : 0;
    return behindCommitsCount > 0;
  }

  const localBuildDate = new Date(localVersionInfo.current_build_date);
  const latestRemoteDate = new Date(dockerLatestRemoteTag.last_updated);
  return (
    latestRemoteDate.getTime() - localBuildDate.getTime() >
    estimatesBuildTimeInMs
  );
}

async function checkNewImageRelease(): Promise<CheckNewVersionResponse> {
  const versionInfo = getProjectVersionInfo();

  const latestTag = await fetchDockerHubLatestTag();

  const latestRemoteDate = new Date(latestTag.last_updated);

  let latestDockerImageLink = `https://hub.docker.com/r/${dockerRepoName}/tags`;
  if (latestTag.digest) {
    latestDockerImageLink = `https://hub.docker.com/layers/${dockerRepoName}/${latestTag.name}/images/${latestTag.digest}`;
  }

  const githubRepLink = `https://github.com/${githubOrgName}/${githubRepoName}`;

  return {
    latest_docker_image: latestDockerImageLink,
    github_repo: githubRepLink,
    current_github_commit: versionInfo.merge_commit_sha,
    is_update_available: isUpdateAvailable({
      dockerLatestRemoteTag: latestTag,
      localVersionInfo: versionInfo
    }),
    latest_docker_image_build_date: latestRemoteDate,
    current_docker_image_build_date: new Date(versionInfo.current_build_date)
  };
}

export default endpoint.serve();
