import { FC } from 'react';

import { FlexBox } from '../FlexBox';
import { CreateEditTeams } from '../Teams/CreateTeams';

export const TeamEdit: FC<{ teamId: ID }> = ({ teamId }) => {
  return (
    <FlexBox>
      <CreateEditTeams teamId={teamId} />
    </FlexBox>
  );
};
