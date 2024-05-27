import { Endpoint, nullSchema } from '@/api-helpers/global';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

const versionFilePath = path.join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '..',
  '..',
  'version.txt'
);

const dockerHubBaseUrl = '`https://hub.docker.com/layers/middlewareeng/middleware'


const endpoint = new Endpoint(nullSchema);

endpoint.handle.GET(nullSchema, async (req, res) => {
  return res.send(await checkNewImageRelease());
});

interface VersionInfo {
  tags: string;
  sha: string;
  date: string;
}

interface CheckResult {
  latest_github_commit: string;
  latest_docker_image: string;
  is_update_available: boolean;
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

function readVersionFile(): VersionInfo {
  const data = fs.readFileSync(versionFilePath, 'utf8');
  const lines = data.split('\n').filter(Boolean);
  const versionInfo: { [key: string]: string } = {};
  lines.forEach((line) => {
    const [key, value] = line.split(': ');
    versionInfo[key] = value;
  });
  return {
    tags: versionInfo['tags'],
    sha: versionInfo['sha'],
    date: versionInfo['date']
  };
}

async function fetchDockerHubTags(): Promise<
  { name: string; last_updated: string; digest: string }[]
> {
  const fetchTagsUrl = `${dockerHubBaseUrl}/tags/`
  const response = await axios.get<DockerHubAPIResponse>(fetchTagsUrl);

  return response.data.results.map((tag) => ({
    name: tag.name,
    digest: tag.images[0].digest,
    last_updated: tag.last_updated
  }));
}

async function checkNewImageRelease(): Promise<CheckResult> {
  const versionInfo = readVersionFile();
  const localDate = new Date(versionInfo.date);
  const remoteTags = await fetchDockerHubTags();

  remoteTags.sort(
    (a, b) =>
      new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()
  );
  const latestTag = remoteTags[0];
  const latestRemoteDate = new Date(latestTag.last_updated);
  const isUpdateAvailable = latestRemoteDate > localDate;


  const latestDockerImageLink = `${dockerHubBaseUrl}/${latestTag.name}/images/${latestTag.digest}`;

  return {
    latest_github_commit: versionInfo.sha,
    latest_docker_image: latestDockerImageLink,
    is_update_available: isUpdateAvailable
  };
}

export default endpoint.serve();
