import { LogoutTwoTone } from '@mui/icons-material';
import { Button, Chip, Tooltip, Typography } from '@mui/material';
import { signOut } from 'next-auth/react';

import { ClustoxWorkspaceSwitcher } from '@/components/ClustoxWorkspaceSwitcher';
import { FlexBox } from '@/components/FlexBox';
import { useClustoxUser } from '@/hooks/useClustoxUser';

/**
 * CLUSTOX: shows who is signed in and provides the only way to sign out.
 * Upstream has no logout affordance at all, since it had no login.
 */
export const ClustoxUserFooter = () => {
  const { user, loading } = useClustoxUser();

  if (loading || !user) return null;

  return (
    <FlexBox col gap={1} py={1.5}>
      {/* Only renders for a SuperAdmin, who owns no workspace of their own. */}
      <ClustoxWorkspaceSwitcher />
      <FlexBox alignCenter gap={1} justifyBetween px={2}>
        <Tooltip title={user.email}>
          <Typography
            variant="body2"
            noWrap
            sx={{ maxWidth: 150, fontWeight: 500 }}
          >
            {user.name || user.email}
          </Typography>
        </Tooltip>
        <Chip
          label={user.role === 'SUPERADMIN' ? 'Superadmin' : 'Admin'}
          size="small"
          color={user.role === 'SUPERADMIN' ? 'primary' : 'default'}
        />
      </FlexBox>
      <FlexBox px={2}>
        <Button
          fullWidth
          size="small"
          variant="outlined"
          color="secondary"
          startIcon={<LogoutTwoTone fontSize="small" />}
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          Sign out
        </Button>
      </FlexBox>
    </FlexBox>
  );
};
