import { FC } from 'react';

import { CRUDProps } from '@/components/Teams/CreateTeams';

import { FlexBox } from '../FlexBox';
import { CreateEditTeams } from '../Teams/CreateTeams';

export const TeamEdit: FC<CRUDProps> = ({
  teamId,
  hideCardComponents,
  onSave,
  onDiscard
}) => {
  return (
    <FlexBox>
      <CreateEditTeams
        teamId={teamId}
        hideCardComponents={hideCardComponents}
        onDiscard={onDiscard}
        onSave={onSave}
      />
    </FlexBox>
  );
};
