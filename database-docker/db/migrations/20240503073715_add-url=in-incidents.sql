-- migrate:up

ALTER TABLE public."Incident"
ADD COLUMN "url" character varying;

-- migrate:down
