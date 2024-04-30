-- migrate:up
ALTER TABLE public."TeamIncidentService" DROP CONSTRAINT "TeamIncidentService_pkey";

ALTER TABLE public."TeamIncidentService" DROP COLUMN id;

ALTER TABLE public."TeamRepos" DROP COLUMN prod_branch;

-- migrate:down

