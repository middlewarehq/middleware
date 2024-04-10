import { Integration } from '@/constants/integrations';

export type DB_OrgRepo = {
  id: string;
  org_id: string;
  name: string;
  provider: Integration;
  org_name: string;
  is_active: boolean;
  contributors?: null;
  default_branch: string;
  language: string;
  created_at: Date;
  updated_at: Date;
  idempotency_key: string;
  slug: string;
};
