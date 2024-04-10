import { styled, Avatar, alpha } from '@mui/material';

export const AvatarPageTitle = styled(Avatar)(({ theme }) => ({
  width: theme.spacing(4),
  height: theme.spacing(4),
  color: theme.colors.primary.main,
  marginTop: theme.spacing(-1),
  marginBottom: theme.spacing(-1),
  marginRight: theme.spacing(2),
  background: alpha(theme.colors.alpha.trueWhite[100], 0.05)
}));
