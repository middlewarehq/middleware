import Cookies, { CookieAttributes } from 'js-cookie';

const attrs: CookieAttributes = {
  expires: 30, // days
  path: '/',
  secure: true
};

export const storage = {
  get: (key: string) => {
    if (typeof window === 'undefined') return;
    const value = Cookies.get(key);
    try {
      return value && JSON.parse(value);
    } catch (e) {
      return value;
    }
  },
  set: (key: string, value: any) => {
    if (typeof window === 'undefined') return;
    if (typeof value === 'string') {
      Cookies.set(key, value, attrs);
    } else {
      Cookies.set(key, JSON.stringify(value), attrs);
    }
  },
  remove: (key: string) => {
    if (typeof window === 'undefined') return;
    Cookies.remove(key, attrs);
  }
};
