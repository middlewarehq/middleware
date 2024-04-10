import { isBefore } from 'date-fns';
import * as yup from 'yup';

import { Endpoint, nullSchema } from '@/api-helpers/global';

const endpoint = new Endpoint(nullSchema, { unauthenticated: true });

const getSchema = yup.object().shape({
  build_time: yup.date().optional()
});

endpoint.handle.GET(getSchema, async (req, res) => {
  const { build_time } = req.payload;

  const lastBuildDate =
    process.env.NEXT_PUBLIC_BUILD_TIME &&
    new Date(process.env.NEXT_PUBLIC_BUILD_TIME);

  const newBuildReady =
    lastBuildDate &&
    build_time &&
    isBefore(new Date(build_time), lastBuildDate);

  res.send({
    status: 'OK',
    environment: process.env.NEXT_PUBLIC_APP_ENVIRONMENT,
    build_time: lastBuildDate,
    new_build_available: newBuildReady
  });
});

export default endpoint.serve();
