import { Terminal } from '@mui/icons-material';
import { FC, ReactNode } from 'react';

import { NoTeamSelected } from '@/components/NoTeamSelected';
import { PageContentWrapper } from '@/components/PageContentWrapper';
import { PageHeader } from '@/components/PageHeader';
import { PageTitleWrapper } from '@/components/PageTitleWrapper';
import { TeamSelectorModes } from '@/components/TeamSelector/TeamSelector';
import { useSingleTeamConfig } from '@/hooks/useStateTeamConfig';

export const PageWrapper: FC<{
  title?: ReactNode;
  subtitle?: ReactNode;
  pageTitle?: string;
  showDate?: boolean;
  teamDateSelectorMode?: TeamSelectorModes;
  headerChildren?: ReactNode;
  isLoading?: boolean;
}> = ({
  title = 'Collaborate',
  pageTitle,
  showDate = true,
  children,
  teamDateSelectorMode,
  headerChildren,
  isLoading
}) => {
  const { noTeamSelected } = useSingleTeamConfig();
  // TODO: use fetchState
  const isLoaderActive = false || isLoading;

  return (
    <>
      <PageTitleWrapper>
        <PageHeader
          loading={isLoaderActive}
          title={title}
          pageTitle={pageTitle}
          icon={<Terminal fontSize="large" />}
          teamDateSelectorMode={
            teamDateSelectorMode || (showDate ? 'single' : 'single-only')
          }
          selectBranch
        >
          {headerChildren}
        </PageHeader>
      </PageTitleWrapper>
      <PageContentWrapper>
        {noTeamSelected ? <NoTeamSelected /> : children}
      </PageContentWrapper>
    </>
  );
};
