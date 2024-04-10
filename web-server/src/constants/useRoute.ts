import { useRouter } from 'next/router';
import { useEffect } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/resources';

import { ROUTES } from './routes';

export const useDefaultRoute = () => {
  return ROUTES.DORA_METRICS;
};

export const useRedirectWithSession = () => {
  const defaultRoute = useDefaultRoute();
  const router = useRouter();
  const { org, orgId } = useAuth();
  const isOrgWelcomed = org?.onboarding_steps?.includes(
    OnboardingStep.WELCOME_SCREEN
  );

  useEffect(() => {
    if (!orgId) return;
    if (!isOrgWelcomed) {
      router.replace(ROUTES.WELCOME.PATH);
      return;
    }
    router.replace(defaultRoute.PATH);
  }, [defaultRoute.PATH, isOrgWelcomed, orgId, router]);
};

const roleList = [UserRole.ENGINEER, UserRole.EM, UserRole.MOM];

export const isRoleGreaterOrEqual = (minRole: UserRole, role: UserRole) => {
  const minIndex = roleList.indexOf(minRole);
  return minIndex <= roleList.indexOf(role);
};

export const isRoleGreaterThanEng = (role: UserRole) =>
  isRoleGreaterOrEqual(UserRole.EM, role);

export const isRoleLessThanEM = (role: UserRole) => !isRoleGreaterThanEng(role);
