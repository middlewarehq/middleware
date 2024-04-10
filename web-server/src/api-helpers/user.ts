import { equals, isNil, reject } from 'ramda';

import { getExcludedTicketTypesSetting } from '@/api-helpers/team';
import { Errors, ResponseError } from '@/constants/error';
import { ApiRequest } from '@/types/request';
import { BaseUser } from '@/types/resources';
import { db } from '@/utils/db';

export const getMiniUsersByOrgId = async (
  orgId: string
): Promise<BaseUser[]> => {
  const [users, identities] = await Promise.all([
    db('Users')
      .select('*')
      .where('org_id', orgId)
      .andWhere('is_deleted', false),
    db('UserIdentity').select('*').where('org_id', orgId)
  ]);

  const avatarsByUserId = identities.reduce(
    (map, idt) => {
      const avatar_url = idt.meta?.avatar_url?.href;
      if (!avatar_url) return map;
      return { ...map, [idt.user_id]: avatar_url };
    },
    {} as Record<ID, string>
  );

  return users.map((user) => ({
    email: user.primary_email,
    id: user.id,
    name: user.name,
    avatar_url: avatarsByUserId[user.id]
  }));
};

export const getUserIdFromReq = (req: ApiRequest, noError: boolean = true) => {
  const id = req?.cookies['application-user-id'];
  if (id) return id;

  if (!noError) throw new ResponseError(Errors.MISSING_USER_ID_IN_COOKIE, 403);
  return null;
};

export const getOriginalUserForViewAsFromReq = (req: ApiRequest) => {
  const id = req?.cookies['original-user-id'];
  if (id) return id;
  return null;
};

export const updateTicketFilterParams = async <T extends {} = {}>(
  userId: ID,
  params: T
) => {
  const excluded_ticket_types = await getExcludedTicketTypesSetting(userId);

  const updatedParams = { excluded_ticket_types };
  const reducedParams = reject(isNil, updatedParams);
  const ticket_filter = equals({}, reducedParams) ? null : reducedParams;

  return reject(isNil, {
    ...params,
    ticket_filter
  }) as T & { ticket_filter?: Partial<typeof updatedParams> };
};
