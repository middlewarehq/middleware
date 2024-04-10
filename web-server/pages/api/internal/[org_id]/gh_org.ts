import * as yup from 'yup';

import { internal } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';
import { LoadedOrg } from '@/types/github';

const pathSchema = yup.object().shape({
  org_id: yup.string().required()
});

const getSchema = yup.object().shape({
  gh_org_name: yup.string().optional().nullable()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  const { gh_org_name, org_id } = req.payload;
  if (!gh_org_name) {
    const response = await internal.get<{ orgs: LoadedOrg[] }>(
      `/orgs/${org_id}/integrations/github/orgs`
    );
    return res.status(200).send(response.data.orgs);
  }

  const response = await getAllDataFromPaginatedAPIs(
    `/orgs/${org_id}/integrations/github/orgs/${gh_org_name}/repos`
  );
  return res.status(200).send(response);
});

export default endpoint.serve();

const getAllDataFromPaginatedAPIs = async (url: string) => {
  let page = 0;
  const result: any[] = [];
  const getData = async () => {
    const response = await internal.get<any[]>(url, {
      params: { page_size: 100, page }
    });
    page++;
    result.push(...response.data);
    if (response.data.length) await getData();
  };

  await getData();
  return result;
};
