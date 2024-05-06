import { useRouter } from 'next/router';
import { useEffect } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { OnboardingStep, UserRole } from '@/types/resources';
import { depFn } from '@/utils/fn';

import { ROUTES } from './routes';

export const useDefaultRoute = () => {
  return ROUTES.DORA_METRICS;
};

export const useRedirectWithSession = () => {
  const defaultRoute = useDefaultRoute();
  const router = useRouter();
  const { org, orgId, onboardingState } = useAuth();

  const isOrgWelcomed = onboardingState.includes(OnboardingStep.WELCOME_SCREEN);

  const anyTeamEverExisted = onboardingState.includes(
    OnboardingStep.TEAM_CREATED
  );

  const isOneCodeProviderIntegrated =
    org?.integrations?.github ||
    org?.integrations?.gitlab ||
    org?.integrations?.bitbucket;

  useEffect(() => {
    if (!orgId || !router.isReady) return;
    if (!isOrgWelcomed) {
      depFn(router.replace, ROUTES.WELCOME.PATH);
      return;
    }
    if (!isOneCodeProviderIntegrated) {
      depFn(router.replace, ROUTES.INTEGRATIONS.PATH);
      return;
    }
    if (!anyTeamEverExisted) {
      depFn(router.replace, ROUTES.TEAMS.PATH);
      return;
    }
    depFn(router.replace, defaultRoute.PATH);
  }, [
    anyTeamEverExisted,
    defaultRoute.PATH,
    isOneCodeProviderIntegrated,
    isOrgWelcomed,
    orgId,
    router.isReady,
    router.replace
  ]);
};

const roleList = [UserRole.ENGINEER, UserRole.EM, UserRole.MOM];

export const isRoleGreaterOrEqual = (minRole: UserRole, role: UserRole) => {
  const minIndex = roleList.indexOf(minRole);
  return minIndex <= roleList.indexOf(role);
};

export const isRoleGreaterThanEng = (role: UserRole) =>
  isRoleGreaterOrEqual(UserRole.EM, role);

export const isRoleLessThanEM = (role: UserRole) => !isRoleGreaterThanEng(role);
