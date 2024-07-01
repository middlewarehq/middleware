import { FC } from 'react';

import { CRUDProps } from '@/components/Teams/CreateTeams';
import { usePageRefreshCallback } from '@/hooks/usePageRefreshCallback';

import { FlexBox } from '../FlexBox';
import { useOverlayPage } from '../OverlayPageContext';
import { CreateEditTeams } from '../Teams/CreateTeams';

export const TeamEdit: FC<CRUDProps> = ({ teamId }) => {
  const { removeAll } = useOverlayPage();
  const pageRefreshCallback = usePageRefreshCallback();

  return (
    <FlexBox>
      <CreateEditTeams
        teamId={teamId}
        onDiscard={removeAll}
        onSave={() => {
          removeAll();
          pageRefreshCallback();
        }}
      />
    </FlexBox>
  );
};
