-- migrate:up

CREATE TABLE public."WebhookEvent" (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    org_id uuid NOT NULL,
    request_type character varying NOT NULL,
    request_data jsonb NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb,
    error jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- migrate:down
