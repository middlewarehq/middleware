import { handleRequest } from '@/api-helpers/axios';
import { Endpoint, nullSchema } from '@/api-helpers/global';

const endpoint = new Endpoint(nullSchema, { unauthenticated: true });

endpoint.handle.GET(nullSchema, async (_req, res) => {
  const lastBuildDate =
    process.env.NEXT_PUBLIC_BUILD_TIME &&
    new Date(process.env.NEXT_PUBLIC_BUILD_TIME);

  const start = new Date();
  const dataCheck = await handleRequest('/');
  const diff = new Date().getTime() - start.getTime();

  res.send({
    status: 'OK',
    environment: process.env.NEXT_PUBLIC_APP_ENVIRONMENT,
    build_time: lastBuildDate,
    data_check: dataCheck,
    latency: diff
  });
});

export default endpoint.serve();
