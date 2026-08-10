import { Chip } from '@mui/material';
import { FC } from 'react';

import { ClustoxRole } from '@/auth/types';

/**
 * CLUSTOX: shared role pill, used anywhere a Superadmin/Admin distinction is
 * shown (Manage Users table, the account menu, the sidebar footer). Was
 * previously reimplemented ad hoc in each of those places.
 */
export const RoleChip: FC<{ role: ClustoxRole; size?: 'small' | 'medium' }> = ({
  role,
  size = 'small'
}) => (
  <Chip
    size={size}
    label={role === 'SUPERADMIN' ? 'Superadmin' : 'Admin'}
    color={role === 'SUPERADMIN' ? 'primary' : 'default'}
    variant={role === 'SUPERADMIN' ? 'filled' : 'outlined'}
    sx={{ fontWeight: 600, letterSpacing: '0.02em' }}
  />
);
