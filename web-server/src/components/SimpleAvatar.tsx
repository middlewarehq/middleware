import { FaceRounded } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import { FC } from 'react';

import { FetchState } from '@/constants/ui-states';
import { useEasyState } from '@/hooks/useEasyState';
import { nameToInitials } from '@/utils/stringAvatar';

import { FlexBox, FlexBoxProps } from './FlexBox';

export const SimpleAvatar: FC<
  {
    url?: string | void;
    name?: string;
    size?: number | string;
    alt?: string;
    hideOnFail?: boolean;
  } & FlexBoxProps
> = ({
  url,
  size = '18px',
  alt = 'untitled image',
  name,
  hideOnFail,
  ...props
}) => {
  const state = useEasyState(FetchState.DORMANT);

  const nameEl = name ? (
    <FlexBox
      noShrink
      height={size}
      width={size}
      bgcolor={colorMap[name[0]] || 'primary.light'}
      round
      fontSize={`calc(${size} / 2.4)`}
      centered
      lineHeight={1}
      fontWeight="bold"
      color="white"
      {...props}
    >
      {nameToInitials(name)}
    </FlexBox>
  ) : null;

  if (!url && name) return nameEl;

  const loadFailed = state.value === FetchState.FAILURE;
  if (loadFailed && hideOnFail) return null;

  if (loadFailed || !url)
    return name ? (
      nameEl
    ) : (
      <FaceRounded
        sx={{
          height: size,
          width: size,
          bgcolor: 'secondary.main',
          color: 'black',
          borderRadius: '100vw'
        }}
      />
    );

  return (
    <>
      {state.value === FetchState.DORMANT ? (
        name ? (
          nameEl
        ) : (
          <CircularProgress size={size} sx={{ flexShrink: 0 }} />
        )
      ) : null}
      <FlexBox
        component="img"
        round
        noShrink
        src={url}
        height={size}
        width={size}
        alt={alt}
        onLoad={() => state.set(FetchState.SUCCESS)}
        onError={() => state.set(FetchState.FAILURE)}
        display={state.value === FetchState.DORMANT ? 'none' : undefined}
        {...props}
      />
    </>
  );
};

const colorMap = Object.fromEntries(
  Object.entries({
    a: '#845EC2',
    b: '#D65DB1',
    c: '#FF6F91',
    d: '#FF9671',
    e: '#FFC75F',
    f: '#2C73D2',
    g: '#0089BA',
    h: '#008E9B',
    i: '#008F7A',
    j: '#B39CD0',
    k: '#00C9A7',
    l: '#4D8076',
    m: '#4B4453',
    n: '#C34A36',
    o: '#FF8066',
    p: '#D5CABD',
    q: '#00C9A7',
    r: '#00C2A8',
    s: '#41227F',
    t: '#FF5171',
    u: '#FF8B56',
    v: '#AE2C00',
    w: '#EE6322',
    x: '#5B81AC',
    y: '#0077DB',
    z: '#00524C'
  }).flatMap(([l, c]) => [
    [l, c],
    [l.toUpperCase(), c]
  ])
);

export const getColorForText = (text: string) =>
  colorMap[(text[0] || 'a').toLowerCase()];
