import { useRouter } from 'next/router';
import { useEffect } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { OnboardingSteps, UserRole } from '@/types/resources';

import { ROUTES } from './routes';

export const useDefaultRoute = () => {
  return ROUTES.DORA_METRICS;
};

export const useRedirectWithSession = () => {
  const defaultRoute = useDefaultRoute();
  const router = useRouter();
  const { org, orgId, onboardingState } = useAuth();

  const isOrgWelcomed = onboardingState.includes(
    OnboardingSteps.WELCOME_SCREEN
  );

  const anyTeamEverExisted = onboardingState.includes(
    OnboardingSteps.TEAM_CREATED
  );

  const isOneCodeProviderIntegrated =
    org?.integrations?.github ||
    org?.integrations?.gitlab ||
    org?.integrations?.bitbucket;

  useEffect(() => {
    if (!orgId) return;
    if (!isOrgWelcomed) {
      router.replace(ROUTES.WELCOME.PATH);
      return;
    }
    if (!isOneCodeProviderIntegrated || !anyTeamEverExisted) {
      router.replace(ROUTES.INTEGRATIONS.PATH);
      return;
    }
    router.replace(defaultRoute.PATH);
  }, [
    anyTeamEverExisted,
    defaultRoute.PATH,
    isOneCodeProviderIntegrated,
    isOrgWelcomed,
    orgId,
    router
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
