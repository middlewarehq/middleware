export const getUrlParam = (param: string) => {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(param);
};

export const OPEN_IN_NEW_TAB_PROPS = {
  target: '_blank',
  rel: 'noopener nofollow noreferrer'
};
