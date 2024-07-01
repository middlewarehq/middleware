export interface Team {
  id: string;
  org_id: string;
  name: string;
  member_ids: string[];
  manager_id?: string;
  created_at: Date;
  updated_at: Date;
  is_deleted: boolean;
  member_filter_enabled?: boolean;
}

export type BaseTeam = {
  id: string;
  name: string;
  member_ids: string[];
  org_id?: string;
};
