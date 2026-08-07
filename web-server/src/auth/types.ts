export type ClustoxRole = 'SUPERADMIN' | 'ADMIN';

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: ClustoxRole;
}

export interface AuthUserRow {
  userId: string;
  email: string;
  name: string;
  role: ClustoxRole;
  passwordHash: string;
}

export interface AuthUserListItem {
  userId: string;
  email: string;
  name: string;
  role: ClustoxRole;
  teamIds: string[];
}
