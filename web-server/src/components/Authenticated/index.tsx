import { Slide } from '@mui/material';
import { TransitionProps } from '@mui/material/transitions/transition';
import { useRouter } from 'next/router';
import { useSnackbar } from 'notistack';
import PropTypes from 'prop-types';
import { FC, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import * as React from 'react';
import { useAuth } from 'src/hooks/useAuth';

import { DURATION } from '@/constants/notification';

interface AuthenticatedProps {
  children: ReactNode;
}

export const Authenticated: FC<AuthenticatedProps> = (props) => {
  const { children } = props;
  const auth = useAuth();
  const router = useRouter();
  const [verified, setVerified] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const [authToastShown, setAuthToastShown] = useState(false);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }
    setVerified(true);

    if (authToastShown) return;
    setAuthToastShown(true);
    enqueueSnackbar('You are successfully authenticated!', {
      variant: 'success',
      autoHideDuration: DURATION,
      TransitionComponent: Slide as React.ComponentType<TransitionProps>
    });
  }, [
    auth.isAuthenticated,
    authToastShown,
    enqueueSnackbar,
    router,
    router.isReady
  ]);

  if (!verified) {
    return null;
  }

  return <>{children}</>;
};

Authenticated.propTypes = {
  children: PropTypes.node
};
