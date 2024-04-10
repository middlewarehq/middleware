import * as yup from 'yup';

import { Endpoint, nullSchema } from '@/api-helpers/global';
import {
  getUserIdFromReq,
  getOriginalUserForViewAsFromReq
} from '@/api-helpers/user';
import { Table } from '@/constants/db';
import { db } from '@/utils/db';

const postSchema = yup.object().shape({
  data: yup
    .array()
    .of(
      yup.object().shape({
        activity_type: yup.string().required(),
        activity_data: yup.object().optional()
      })
    )
    .required()
});

const endpoint = new Endpoint(nullSchema);

endpoint.handle.POST(postSchema, async (req, res) => {
  const { data } = req.payload;
  const user_id = getUserIdFromReq(req, true);

  let impersonated_by = getOriginalUserForViewAsFromReq(req) || null;
  if (user_id === impersonated_by) impersonated_by = null;

  if (!user_id) {
    return res.send({ success: false, message: 'User ID not found' });
  }

  await db(Table.UserActivity).insert(
    data.map((item) => ({ ...item, user_id, impersonated_by }))
  );

  res.send({ success: true });
});

export default endpoint.serve();
