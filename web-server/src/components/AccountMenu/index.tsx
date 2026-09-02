import {
  ExpandMoreRounded,
  LogoutTwoTone,
  ManageAccountsTwoTone
} from '@mui/icons-material';
import {
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
  useTheme
} from '@mui/material';
import { signOut } from 'next-auth/react';
import NextLink from 'next/link';
import { FC, useState } from 'react';

import { FlexBox } from '@/components/FlexBox';
import { RoleChip } from '@/components/RoleChip';
import { UserAvatar } from '@/components/UserAvatar';
import { ROUTES } from '@/constants/routes';
import { useClustoxUser } from '@/hooks/useClustoxUser';

/**
 * CLUSTOX: the account identity + sign-out surface, moved to the top-right
 * of every page (rendered once, inside PageHeader) instead of living as a
 * static block at the bottom of the sidebar. "Manage users" is included
 * here as a shortcut for Superadmins, mirroring its (also role-gated)
 * sidebar entry.
 *
 * No "Profile settings" entry: there's no per-user profile page in this
 * app yet (the existing /settings page is org-level sync config, not
 * personal account settings) -- adding a menu item that opens the wrong
 * thing would be worse than not having one.
 */
export const AccountMenu: FC = () => {
  const { user, loading, isSuperadmin } = useClustoxUser();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const theme = useTheme();

  if (loading || !user) return null;

  return (
    <>
      <FlexBox
        alignCenter
        gap={1}
        py={0.5}
        pl={0.5}
        pr={1}
        corner="999px"
        sx={{
          cursor: 'pointer',
          border: '1px solid transparent',
          '&:hover': {
            background: 'rgba(255,255,255,0.04)',
            borderColor: theme.colors.alpha.trueWhite[10]
          }
        }}
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        <UserAvatar name={user.name} email={user.email} size={30} />
        <FlexBox col gap={0.25}>
          <Typography variant="body2" fontWeight={600} lineHeight={1.1}>
            {user.name}
          </Typography>
          <RoleChip role={user.role} />
        </FlexBox>
        <ExpandMoreRounded fontSize="small" sx={{ opacity: 0.6 }} />
      </FlexBox>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 250, mt: 1 } }}
      >
        <FlexBox col px={2} py={1.5} gap={0.25}>
          <Typography variant="body2" fontWeight={600}>
            {user.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {user.email}
          </Typography>
        </FlexBox>
        <Divider />

        {isSuperadmin && (
          <NextLink href={ROUTES.USERS.PATH} passHref legacyBehavior>
            <MenuItem component="a" onClick={() => setAnchor(null)}>
              <ListItemIcon>
                <ManageAccountsTwoTone fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Manage users" />
            </MenuItem>
          </NextLink>
        )}

        <MenuItem
          // CLUSTOX: redirect client-side, not via next-auth's callbackUrl.
          // A relative callbackUrl is resolved server-side against
          // NEXTAUTH_URL, so on the server (where that env is not the public
          // domain) signing out landed on localhost's login page.
          // window.location resolves against whatever origin the user is
          // actually on, and the full page load clears client state too.
          onClick={async () => {
            await signOut({ redirect: false });
            window.location.assign('/login');
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <LogoutTwoTone fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText primary="Log out" />
        </MenuItem>
      </Menu>
    </>
  );
};
