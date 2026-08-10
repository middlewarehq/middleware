import { Avatar, SxProps } from '@mui/material';
import { FC } from 'react';

// CLUSTOX: a fixed small palette of gradient pairs, picked by a hash of the
// name/email so a given person always gets the same gradient across
// renders (and across the app) without persisting a color choice anywhere.
const GRADIENTS: [string, string][] = [
  ['#8C7CF0', '#5f4fd6'],
  ['#57CA22', '#3a8a17'],
  ['#FFA319', '#a06b0f'],
  ['#26C6DA', '#0E7C8C'],
  ['#FF6B82', '#C23854'],
  ['#5C9DFF', '#2E5FBF']
];

const hashToIndex = (source: string, length: number) => {
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = (hash << 5) - hash + source.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % length;
};

export const initials = (name: string, email: string) => {
  const source = name?.trim() || email || '';
  const parts = source.split(/[\s.@]+/).filter(Boolean);
  return (parts[0]?.[0] ?? '?').concat(parts[1]?.[0] ?? '').toUpperCase();
};

/**
 * Shared avatar-with-gradient-initials, used wherever a person is shown
 * (Manage Users table, the account menu). Replaces flat single-color
 * avatars that were reimplemented per-page.
 */
export const UserAvatar: FC<{
  name: string;
  email: string;
  size?: number;
  sx?: SxProps;
}> = ({ name, email, size = 34, sx }) => {
  const [from, to] = GRADIENTS[hashToIndex(email || name || '', GRADIENTS.length)];

  return (
    <Avatar
      sx={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        fontWeight: 700,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        color: '#fff',
        ...sx
      }}
    >
      {initials(name, email)}
    </Avatar>
  );
};
