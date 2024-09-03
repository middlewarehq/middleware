import axios from 'axios';
import { Endpoint, nullSchema } from '@/api-helpers/global';

const endpoint = new Endpoint(nullSchema);

const githubRepoApiUrl = `https://api.github.com/repos/middlewarehq/middleware`;

type GithubStarsAPIResponse = {
  stargazers_count: number;
};

endpoint.handle.GET(nullSchema, async (_req, res) => {
  const response = await axios.get<GithubStarsAPIResponse>(githubRepoApiUrl);

  res.send({
    stargazers_count: response.data.stargazers_count
  });
});

export default endpoint.serve();
