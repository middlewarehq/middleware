import createCache from '@emotion/cache';
// import stylisRTLPlugin from 'stylis-plugin-rtl';

export default function createEmotionCache() {
  return createCache({
    key: 'css'
    // // @ts-ignore
    // stylisPlugins: [stylisRTLPlugin]
  });
}
