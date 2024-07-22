import { useMemo } from 'react';

import { Integration } from '@/constants/integrations';
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
          })
      },
      unlink: {
        github: () => unlinkProvider(orgId, Integration.GITHUB)
      }
    };

    return handlers;
  }, [addModal, closeAllModals, orgId]);
};
