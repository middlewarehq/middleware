-- migrate:up

ALTER TABLE public."PullRequest" DROP COLUMN lead_time;

-- migrate:down
