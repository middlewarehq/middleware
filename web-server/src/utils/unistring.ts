import FastestValidator from 'fastest-validator';

// unid = unistring ID

const uuidValidator = new FastestValidator().compile({
  uuid: { type: 'uuid' }
});

export const isUuid = (id: ID) => uuidValidator({ uuid: id });

/**
 * #### Unistring ID utils
 * ---
 * UNID Examples
 *
 * Team: `TEAM_<UUID>` /
 * User: `USER_<UUID>`
 */
export const unid = {
  /** Get unistring ID for a user, from a valid UUID */
  u: (id: string) => isUuid(id) && `USER_${id}`,
  /** Get unistring ID for a team, from a valid UUID */
  t: (id: string) => isUuid(id) && `TEAM_${id}`,
  /** Get UUID from a unistring ID */
  id: (un_id: string) => un_id.split('_')[1]
};

const isValidUnid = (unid: ID, type: string) => {
  const [typePart, idPart] = unid.split('_')[0];
  return type === typePart && isUuid(idPart);
};

export const isUnid = {
  u: (id: string) => isValidUnid(id, 'USER'),
  t: (id: string) => isValidUnid(id, 'TEAM')
};
