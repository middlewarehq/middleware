import * as yup from 'yup';

import { handleRequest } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';
import { OrgResetBookmarkApiResponse } from '@/types/resources';

const pathSchema = yup.object().shape({
  org_id: yup.string().uuid().required()
});

const putSchema = yup.object().shape({
  bookmark_timestamp: yup.string().optional(),
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.PUT(putSchema, async (req, res) => {
  const { org_id, bookmark_timestamp } = req.payload;
  return res.send(
    await handleRequest<OrgResetBookmarkApiResponse>(
      `/orgs/${org_id}/bookmark/reset`,
      {
        method: 'PUT',
        // data: {
        //   bookmark_timestamp
        // }
      }
    )
  );
});

export default endpoint.serve();
