import { Terminal } from '@mui/icons-material';
import { FC, ReactNode } from 'react';

import { NoTeamSelected } from '@/components/NoTeamSelected';
import { PageContentWrapper } from '@/components/PageContentWrapper';
import { PageHeader } from '@/components/PageHeader';
import { PageTitleWrapper } from '@/components/PageTitleWrapper';
import { useSingleTeamConfig } from '@/hooks/useStateTeamConfig';
import { TeamSelectorModes } from '@/types/resources';

export const PageWrapper: FC<{
  title?: ReactNode;
  hideAllSelectors?: boolean;
  subtitle?: ReactNode;
  pageTitle?: string;
  showDate?: boolean;
  teamDateSelectorMode?: TeamSelectorModes;
  headerChildren?: ReactNode;
  isLoading?: boolean;
  showEvenIfNoTeamSelected?: boolean;
}> = ({
  title = 'Collaborate',
  hideAllSelectors,
  pageTitle,
  showDate = true,
  children,
  teamDateSelectorMode,
  headerChildren,
  isLoading,
  showEvenIfNoTeamSelected = false
}) => {
  const { noTeamSelected } = useSingleTeamConfig();
  // TODO: use fetchState
  const isLoaderActive = false || isLoading;

  return (
    <>
      <PageTitleWrapper>
        <PageHeader
          hideAllSelectors={hideAllSelectors}
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
        {!showEvenIfNoTeamSelected && noTeamSelected ? (
          <NoTeamSelected />
        ) : (
          children
        )}
      </PageContentWrapper>
    </>
  );
};
