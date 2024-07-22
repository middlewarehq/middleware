import { useMemo } from 'react';

import { Integration } from '@/constants/integrations';
import { ConfigureGitlabModalBody } from '@/content/Dashboards/ConfigureGitlabModalBody';
import { useModal } from '@/contexts/ModalContext';
import { useAuth } from '@/hooks/useAuth';
import { unlinkProvider } from '@/utils/auth';

import { ConfigureGithubModalBody } from './ConfigureGithubModalBody';

export const useIntegrationHandlers = () => {
  const { orgId } = useAuth();

  const { addModal, closeAllModals } = useModal();

  return useMemo(() => {
    const handlers = {
      link: {
        github: () =>
          addModal({
            title: 'Configure Github',
            body: <ConfigureGithubModalBody onClose={closeAllModals} />,
            showCloseIcon: true
          }),
        gitlab: () =>
          addModal({
            title: 'Configure Gitlab',
            body: <ConfigureGitlabModalBody onClose={closeAllModals} />,
            showCloseIcon: true
          })
      },
      unlink: {
        github: () => unlinkProvider(orgId, Integration.GITHUB),
        gitlab: () => unlinkProvider(orgId, Integration.GITLAB)
      }
    };

    return handlers;
  }, [addModal, closeAllModals, orgId]);
};
