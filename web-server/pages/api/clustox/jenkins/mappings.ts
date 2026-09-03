// CLUSTOX: BFF route for the Jenkins job-to-repo mapping. GET lists what is
// mapped, POST creates a mapping, DELETE removes it; all three proxy straight
// through to the analytics server, which owns the one-active-deployment-source
// -per-repo invariant.
import * as yup from 'yup';

import { internal } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';
import { forwardInternalError } from '@/api-helpers/internal-error';

// Only what every method here shares. A method-specific schema in the
// constructor is validated on *all* methods, which made the others a permanent
// 400 -- fixed once already, so the per-method shapes stay below.
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

// CLUSTOX: what the mapping table renders as already-mapped. Each row carries
// the repo_workflow_id, which is the only thing that can address a mapping for
// removal -- without this call a mapping can be created but never undone.
endpoint.handle.GET(pathSchema, async (req, res) => {
  const result = await internal
    .get(`/orgs/${req.payload.org_id}/integrations/jenkins/mappings`)
    .catch(forwardInternalError);
  res.send({ mappings: result.data });
});

endpoint.handle.POST(postSchema, async (req, res) => {
  // One deployment source per repo: creating this mapping deactivates the
  // repo's GitHub Actions workflows and switches every team tracking the repo
  // to workflow-based deployments, so Jenkins runs are what get counted.
  const result = await internal
    .post(`/orgs/${req.payload.org_id}/integrations/jenkins/mappings`, {
      org_repo_id: req.payload.org_repo_id,
      job_full_name: req.payload.job_full_name
    })
    .catch(forwardInternalError);
  res.send(result.data);
});

endpoint.handle.DELETE(deleteSchema, async (req, res) => {
  const result = await internal
    .delete(`/orgs/${req.payload.org_id}/integrations/jenkins/mappings`, {
      data: { repo_workflow_id: req.payload.repo_workflow_id }
    })
    .catch(forwardInternalError);
  res.send(result.data);
});

export default endpoint.serve();
