import axios from 'axios';
import { Session } from 'next-auth';
import { FC, createContext, useEffect, useCallback } from 'react';
import { useMemo } from 'react';

import { Integration } from '@/constants/integrations';
import { useBoolState, useEasyState } from '@/hooks/useEasyState';
import { useRefMounted } from '@/hooks/useRefMounted';
import {
  authSlice,
  State as AuthState,
  initialState as initialAuthState,
  fetchIntegrationsMap
} from '@/slices/auth';
import { useDispatch, useSelector } from '@/store';
import { UserRole, IntegrationGroup, OnboardingStep } from '@/types/resources';
import { depFn } from '@/utils/fn';

type CodeProviderIntegrations =
  | Integration.GITHUB
  | Integration.GITLAB
  | Integration.BITBUCKET;
export interface AuthContextValue extends AuthState {
  userId: string | null;
  orgId: string | null;
  role: UserRole;
  integrations: Org['integrations'];
  onboardingState: OnboardingStep[];
  integrationList: Integration[];
  integrationSet: Set<IntegrationGroup>;
  activeCodeProvider: CodeProviderIntegrations | null;
}

export const AuthContext = createContext<AuthContextValue>({
  ...initialAuthState,
  userId: '00000000-0000-0000-0000-000000000000',
  orgId: null,
  role: UserRole.MOM,
  integrations: {},
  onboardingState: [],
  integrationList: [],
  integrationSet: new Set(),
  activeCodeProvider: null
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
        await dispatch(
          authSlice.actions.init({
            isAuthenticated: true,
            org: org
          })
        );
        dispatch(fetchIntegrationsMap({ orgId: org.id }));
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
        []
          .concat(
            (integrations.github || integrations.gitlab) &&
              IntegrationGroup.CODE
          )
          .filter(Boolean)
      ),
    [integrations.github, integrations.gitlab]
  );

  const integrationList = useMemo(
    () =>
      Object.entries(integrations)
        .filter(([_, value]) => value.integrated)
        .map(([key, _]) => key) as Integration[],
    [integrations]
  );

  const activeCodeProvider = useMemo(
    () =>
      Object.keys(state?.org?.integrations || {}).find(
        (integrationName) =>
          state?.org?.integrations[integrationName as keyof IntegrationsMap]
            ?.integrated
      ) as CodeProviderIntegrations | null,
    [state?.org?.integrations]
  );

  return (
    <AuthContext.Provider
      value={{
        ...state,
        userId: '00000000-0000-0000-0000-000000000000',
        orgId: state.org?.id,
        role,
        integrations,
        integrationSet,
        integrationList,
        activeCodeProvider,
        onboardingState: (state.org?.onboarding_state as OnboardingStep[]) || []
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const AuthConsumer = AuthContext.Consumer;
