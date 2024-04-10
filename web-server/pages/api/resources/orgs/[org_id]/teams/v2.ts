import { uniq } from 'ramda';
import * as yup from 'yup';

import { handleRequest } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';
import { getTeamV2Mock } from '@/mocks/teams';
import { BaseTeam } from '@/types/api/teams';
import { db, getFirstRow } from '@/utils/db';

const getSchema = yup.object().shape({
  user_id: yup.string().uuid().nullable().optional(),
  include_teams: yup.array().of(yup.string().uuid()).nullable().optional()
});

const postSchema = yup.object().shape({
  repo_ids: yup.array().of(yup.string().uuid()).nullable().optional(),
  manager_id: yup.string().uuid().nullable().optional(),
  name: yup.string().required()
});

const patchSchema = yup.object().shape({
  id: yup.string().uuid().required(),
  name: yup.string().nullable().optional(),
  member_ids: yup.array().of(yup.string().uuid()).nullable().optional(),
  manager_id: yup.string().uuid().nullable().optional()
});

const deleteSchema = yup.object().shape({
  id: yup.string().uuid().required()
});

const pathnameSchema = yup.object().shape({
  org_id: yup.string().uuid().required()
});

const endpoint = new Endpoint(pathnameSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send(getTeamV2Mock);
  }

  const { org_id } = req.payload;
  /**
   * If `user_id` was passed, show teams where the user is either a
   * reportee or a manager
   */

  const getQuery = db('Team')
    .select('*')
    .where('org_id', org_id)
    .andWhereNot('is_deleted', true)
    .orderBy('name', 'asc');

  const data = await getQuery;

  res.send({
    teams: data,
    users: {}
  });
});

endpoint.handle.POST(postSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send(getTeamV2Mock);
  }

  const { manager_id, repo_ids = [], org_id, name } = req.payload;

  const member_ids_to_insert = uniq<ID>(repo_ids)?.filter(
    (id: ID) => id !== manager_id
  );

  const data = await createTeam(org_id, name, member_ids_to_insert);

  res.send(data);
});

endpoint.handle.PATCH(patchSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send(getTeamV2Mock);
  }

  const { manager_id, member_ids, org_id, id, name } = req.payload;

  const upsertPayload: Record<string, any> = {
    id,
    org_id,
    updated_at: new Date(),
    manager_id: null
  };

  if (name) {
    upsertPayload.name = name;
  }
  if (member_ids) {
    upsertPayload.member_ids = uniq(member_ids);

    if (Boolean(manager_id)) {
      upsertPayload.member_ids = upsertPayload.member_ids.filter(
        (id: string) => id !== manager_id
      );
    }
  }

  const data = await updateTeam(id, name, member_ids);

  res.send([data]);
});

endpoint.handle.DELETE(deleteSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send(getTeamV2Mock);
  }

  const data = await db('Team')
    .update('is_deleted', true)
    .where('id', req.payload.id)
    .orderBy('name', 'asc')
    .returning('*')
    .then(getFirstRow);

  res.send(data);
});

export default endpoint.serve();

const updateTeam = async (
  team_id: ID,
  team_name: string,
  member_ids: string[]
): Promise<BaseTeam> => {
  return handleRequest<BaseTeam>(`/team/${team_id}`, {
    method: 'PATCH',
    data: {
      name: team_name,
      member_ids: uniq(member_ids)
    }
  });
};

const createTeam = async (
  org_id: ID,
  team_name: string,
  member_ids: string[]
): Promise<BaseTeam> => {
  return handleRequest<BaseTeam>(`/org/${org_id}/team`, {
    method: 'POST',
    data: {
      name: team_name,
      member_ids: uniq(member_ids)
    }
  });
};
