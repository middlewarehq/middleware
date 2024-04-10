import Link from 'next/link';
import { GoLinkExternal } from 'react-icons/go';

import { Line } from '@/components/Text';
import { OPEN_IN_NEW_TAB_PROPS } from '@/utils/url';

export const getDoraLink = (text: string) => (
  <Link
    href={`https://cloud.google.com/blog/products/devops-sre/using-the-four-keys-to-measure-your-devops-performance#:~:text=Calculating%20the%20metrics`}
    passHref
    {...OPEN_IN_NEW_TAB_PROPS}
  >
    <Line
      tiny
      sx={{
        cursor: 'pointer',
        display: 'flex',
        whiteSpace: 'pre',
        alignItems: 'center',
        gap: 1 / 2
      }}
      underline
      dotted
      medium
      white
    >
      <span>{text}</span> <GoLinkExternal />
    </Line>
  </Link>
);
