import { AllSystemCSSProperties } from '@mui/system';

import { langColors } from '@/constants/lang-colors';

const DEFAULT_COLOR_CODE = '#2E4053';
const stringColorMap = {} as Record<string, string>;

export const stringToColor = (string: string): string => {
  if (!string) return DEFAULT_COLOR_CODE;
  string = string.toLowerCase();
  if (stringColorMap[string]) return stringColorMap[string];
  if (langColors[string]) return langColors[string].color;

  let hash = 0;
  let i: number;

  /* eslint-disable no-bitwise */
  for (i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = '#';

  for (i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  /* eslint-enable no-bitwise */

  stringColorMap[string] = color;
  return color;
};

export const nameToInitials = (name: string = ''): string =>
  `${name.split(' ')[0]?.[0]}${name.split(' ')[1]?.[0] || ''}`;

export const stringAvatar = (
  name: string = '',
  sx: AllSystemCSSProperties & { size?: string | number } = {}
) => {
  const size = sx.height || sx.width || sx.size;
  const height = sx.size || sx.height;
  const width = sx.size || sx.width;

  return {
    sx: {
      ...(size ? { fontSize: `calc(${sx.fontSize || size} / 2)` } : {}),
      ...sx,
      height,
      width,
      bgcolor: stringToColor(name)
    },
    children: nameToInitials(name)
  };
};
