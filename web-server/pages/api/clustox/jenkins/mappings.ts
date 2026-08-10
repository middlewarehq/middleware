// CLUSTOX: BFF route for the Jenkins job-to-repo mapping. POST creates the
// mapping, DELETE removes it; both proxy straight through to the analytics
// server, which owns the one-active-deployment-source-per-repo invariant.
import * as yup from 'yup';

import { Endpoint } from '@/api-helpers/global';
import { internal } from '@/api-helpers/axios';

const pathSchema = yup.object().shape({
  org_id: yup.string().uuid().required()
});

const postSchema = yup.object().shape({
  org_id: yup.string().uuid().required(),
  org_repo_id: yup.string().uuid().required(),
  job_full_name: yup.string().required()
});

const deleteSchema = yup.object().shape({
  org_id: yup.string().uuid().required(),
  repo_workflow_id: yup.string().uuid().required()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.POST(postSchema, async (req, res) => {
  // One deployment source per repo: creating this mapping deactivates the
  // repo's GitHub Actions workflows so deployments are not counted twice.
  const result = await internal.post(
    `/orgs/${req.payload.org_id}/integrations/jenkins/mappings`,
    {
      org_repo_id: req.payload.org_repo_id,
      job_full_name: req.payload.job_full_name
    }
  );
  res.send(result.data);
});

endpoint.handle.DELETE(deleteSchema, async (req, res) => {
  const result = await internal.delete(
    `/orgs/${req.payload.org_id}/integrations/jenkins/mappings`,
    { data: { repo_workflow_id: req.payload.repo_workflow_id } }
  );
  res.send(result.data);
});

export default endpoint.serve();
