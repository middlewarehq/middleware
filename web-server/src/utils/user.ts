import { Row } from '@/constants/db';
import { BaseUser } from '@/types/resources';

export type UserProfile = User;

export const getAvatar = (user?: User): string | undefined => {
  if (user?.identities?.github?.username)
    return getGHAvatar(user?.identities?.github?.username);
  else if (user?.identities?.bitbucket?.meta?.avatar_url)
    return user?.identities?.bitbucket?.meta?.avatar_url;
};

export const getAvatarObj = (url: string) => ({
  avatar_url: { href: url }
});

export const getGHAvatar = (handle?: string, size: number = 128) =>
  handle && `https://github.com/${handle}.png?size=${size}`;

export const getLangIcon = (lang: string) =>
  `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${lang}/${lang}-plain.svg`;

export const getBaseUserFromRowUser = (user: Row<'Users'>): BaseUser => ({
  email: user.primary_email,
  id: user.id,
  name: user.name,
  avatar_url: null
});
