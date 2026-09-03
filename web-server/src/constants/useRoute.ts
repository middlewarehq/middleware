import { useRouter } from 'next/router';
import { useEffect } from 'react';

import { useAuth } from '@/hooks/useAuth';
// CLUSTOX: a SuperAdmin is not subject to workspace onboarding gates.
import { useClustoxUser } from '@/hooks/useClustoxUser';
import { OnboardingStep, UserRole } from '@/types/resources';

import { ROUTES } from './routes';

export const useDefaultRoute = () => {
  return ROUTES.DORA_METRICS;
};

export const useRedirectWithSession = () => {
  const defaultRoute = useDefaultRoute();
  const router = useRouter();
  const { org, orgId, onboardingState } = useAuth();
  // CLUSTOX: a SuperAdmin owns no workspace of their own, so the onboarding
  // gates below (welcome screen, integration linked, team created) describe a
  // workspace they are merely viewing. Forcing them through those would leave
  // them unable to reach user management or the workspace switcher.
  const { isSuperadmin } = useClustoxUser();

  const isOrgWelcomed = onboardingState.includes(OnboardingStep.WELCOME_SCREEN);

  const anyTeamEverExisted = onboardingState.includes(
    OnboardingStep.TEAM_CREATED
  );

  const isOneCodeProviderIntegrated =
    org?.integrations?.github ||
    org?.integrations?.gitlab ||
    org?.integrations?.bitbucket;

  useEffect(() => {
    if (!router.isReady) return;
    if (isSuperadmin) return;
    if (!isOrgWelcomed) {
      router.replace(ROUTES.WELCOME.PATH);
      return;
    }
    if (
      !isOneCodeProviderIntegrated &&
      router.pathname !== ROUTES.INTEGRATIONS.PATH
    ) {
      router.replace(ROUTES.INTEGRATIONS.PATH);
      return;
    }
    if (!anyTeamEverExisted && router.pathname !== ROUTES.TEAMS.PATH) {
      router.replace(ROUTES.TEAMS.PATH);
      return;
    }
    if (router.pathname === ROUTES.BASE) {
      router.replace(defaultRoute.PATH);
    }
  }, [
    anyTeamEverExisted,
    defaultRoute.PATH,
    isOneCodeProviderIntegrated,
    isOrgWelcomed,
    isSuperadmin,
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
