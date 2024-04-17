import { FC } from 'react';

import { FlexBox } from '../FlexBox';
import { CreateEditTeams } from '../Teams/CreateTeams';

export const TeamEdit: FC<{ teamId: ID; hideCardComponents?: boolean }> = ({
  teamId,
  hideCardComponents
}) => {
  return (
    <FlexBox>
      <CreateEditTeams
        teamId={teamId}
        hideCardComponents={hideCardComponents}
      />
    </FlexBox>
  );
};
