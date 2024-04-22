import axios from 'axios';
import { Session } from 'next-auth';
import { FC, createContext, useEffect, useCallback } from 'react';
import { useMemo } from 'react';

import { useBoolState, useEasyState } from '@/hooks/useEasyState';
import { useRefMounted } from '@/hooks/useRefMounted';
import {
  authSlice,
  State as AuthState,
  initialState as initialAuthState
} from '@/slices/auth';
import { useDispatch, useSelector } from '@/store';
import { UserRole, IntegrationGroup, OnboardingStep } from '@/types/resources';
import { depFn } from '@/utils/fn';

export interface AuthContextValue extends AuthState {
  orgId: string | null;
  role: UserRole;
  integrations: User['integrations'];
  onboardingState: OnboardingStep[];
  integrationSet: Set<IntegrationGroup>;
}

export const AuthContext = createContext<AuthContextValue>({
  ...initialAuthState,
  orgId: null,
  role: UserRole.MOM,
  integrations: {},
  onboardingState: [],
  integrationSet: new Set()
});

export const AuthProvider: FC = (props) => {
  const { children } = props;
  const dispatch = useDispatch();
  const state = useSelector((state) => state.auth);
  const isMounted = useRefMounted();

  const sessionState = useEasyState<Session | null>(null);
  const loadingState = useBoolState(true);

  const fetchSession = useCallback(() => {
    return axios
      .get('/api/auth/session')
      .then((r) => r.data)
      .then(sessionState.set);
  }, [sessionState.set]);

  useEffect(() => {
    depFn(loadingState.trackAsync, fetchSession);
  }, [fetchSession, loadingState.trackAsync, sessionState.set]);

  const session = sessionState.value;
  const loading = loadingState.value;

  const initialize = useCallback(async () => {
    if (loading) return;

    const onUnauthenticated = (err?: Error) => {
      err && console.error(err);
      dispatch(
        authSlice.actions.init({
          isAuthenticated: false
        })
      );
    };

    try {
      if (!isMounted()) return;
      const org = session?.org;
      if (org) {
        // @ts-ignore
        // window.FreshworksWidget?.('identify', 'ticketForm', {
        //   name: identifyConfig.name,
        //   email: identifyConfig.email
        // });
        dispatch(
          authSlice.actions.init({
            isAuthenticated: true,
            org: org
          })
        );
      } else {
        onUnauthenticated();
      }
    } catch (err: any) {
      onUnauthenticated(err as Error);
    }
  }, [dispatch, isMounted, loading, session?.org]);

  useEffect(() => {
    if (loading) return;
    initialize();
  }, [initialize, loading]);

  const role = UserRole.MOM;

  const integrations = useMemo(
    () => state?.org?.integrations || {},
    [state?.org?.integrations]
  );

  const integrationSet = useMemo(
    () =>
      new Set<IntegrationGroup>(
        [].concat(integrations.github && IntegrationGroup.CODE).filter(Boolean)
      ),
    [integrations.github]
  );

  return (
    <AuthContext.Provider
      value={{
        ...state,
        orgId: state.org?.id,
        role,
        integrations,
        integrationSet,
        onboardingState: state.org?.onboarding_state || []
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const AuthConsumer = AuthContext.Consumer;
