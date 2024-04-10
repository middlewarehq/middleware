import { FC, HTMLProps } from 'react';

import LogoLongSvg from './logo-long.svg';
import LogoSvg from './logo.svg';

export const Logo: FC<
  HTMLProps<SVGSVGElement> & { mode?: 'short' | 'long' }
> = (props) => {
  if (props.mode === 'long') return <LogoLongSvg height="100%" {...props} />;
  return <LogoSvg height="100%" {...props} />;
};
