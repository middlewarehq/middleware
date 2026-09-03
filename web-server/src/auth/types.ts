export type ClustoxRole = 'SUPERADMIN' | 'ADMIN';

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: ClustoxRole;
  /**
   * The workspace this user owns.
   *
   * null for SUPERADMIN, who sits above every workspace rather than owning
   * one. Upstream's Users.org_id is already nullable, so this needs no schema
   * change -- the column was built for exactly this.
   */
  orgId: string | null;
}

export interface AuthUserRow {
  userId: string;
  email: string;
  name: string;
  role: ClustoxRole;
  orgId: string | null;
  passwordHash: string;
}

export interface AuthUserListItem {
  userId: string;
  email: string;
  name: string;
  role: ClustoxRole;
  orgId: string | null;
  orgName: string | null;
  teamIds: string[];
}
