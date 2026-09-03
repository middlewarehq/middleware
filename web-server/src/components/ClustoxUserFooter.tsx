import { ClustoxWorkspaceSwitcher } from '@/components/ClustoxWorkspaceSwitcher';
import { FlexBox } from '@/components/FlexBox';
import { useClustoxUser } from '@/hooks/useClustoxUser';

/**
 * CLUSTOX: the Superadmin's workspace switcher, at the bottom of the
 * sidebar.
 *
 * Identity (name/role) and sign-out used to live here too, but that's now
 * covered by the account menu at the top-right of every page (see
 * PageHeader -> AccountMenu) -- kept only the piece that has no other home.
 */
export const ClustoxUserFooter = () => {
  const { user, loading, isSuperadmin } = useClustoxUser();

  // ClustoxWorkspaceSwitcher itself renders null for a non-Superadmin, but
  // checking here too avoids Sidebar rendering an empty padded box between
  // its two surrounding Dividers for every Admin.
  if (loading || !user || !isSuperadmin) return null;

  return (
    <FlexBox col py={1.5}>
      <ClustoxWorkspaceSwitcher />
    </FlexBox>
  );
};
