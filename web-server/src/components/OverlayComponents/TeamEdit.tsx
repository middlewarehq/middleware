import { FC } from 'react';

import { CRUDProps } from '@/components/Teams/CreateTeams';

import { FlexBox } from '../FlexBox';
import { useOverlayPage } from '../OverlayPageContext';
import { CreateEditTeams } from '../Teams/CreateTeams';

export const TeamEdit: FC<CRUDProps> = ({ teamId, hideCardComponents }) => {
  const { removeAll } = useOverlayPage();
  return (
    <FlexBox>
      <CreateEditTeams
        teamId={teamId}
        hideCardComponents={hideCardComponents}
        onDiscard={removeAll}
        onSave={removeAll}
      />
    </FlexBox>
  );
};
