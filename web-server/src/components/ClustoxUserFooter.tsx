import { LogoutTwoTone } from '@mui/icons-material';
import { Button, Chip, Tooltip, Typography } from '@mui/material';
import { signOut } from 'next-auth/react';

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
    <FlexBox col gap={1} px={2} py={1.5}>
      <FlexBox alignCenter gap={1} justifyBetween>
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
      <Button
        size="small"
        variant="outlined"
        color="secondary"
        startIcon={<LogoutTwoTone fontSize="small" />}
        onClick={() => signOut({ callbackUrl: '/login' })}
      >
        Sign out
      </Button>
    </FlexBox>
  );
};
