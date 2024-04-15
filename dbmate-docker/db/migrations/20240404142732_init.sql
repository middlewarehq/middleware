-- migrate:up

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
SET default_tablespace = '';
SET default_table_access_method = heap;

--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA extensions;


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: Bookmark; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Bookmark" (
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    repo_id uuid NOT NULL,
    bookmark character varying NOT NULL,
    type character varying NOT NULL
);

--
-- Name: BookmarkMergeToDeployBroker; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BookmarkMergeToDeployBroker" (
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    repo_id uuid NOT NULL,
    bookmark character varying NOT NULL
);

--
-- Name: BookmarkPullRequestRevertPRMapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BookmarkPullRequestRevertPRMapping" (
    repo_id uuid NOT NULL,
    bookmark character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

--
-- Name: Incident; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Incident" (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    provider character varying NOT NULL,
    key character varying NOT NULL,
    incident_number integer,
    status character varying,
    title character varying,
    acknowledged_date timestamp with time zone,
    resolved_date timestamp with time zone,
    assigned_to character varying,
    created_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    updated_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    creation_date timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    assignees character varying[],
    incident_type character varying DEFAULT 'INCIDENT'::character varying
);


--
-- Name: IncidentOrgIncidentServiceMap; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."IncidentOrgIncidentServiceMap" (
    incident_id uuid NOT NULL,
    service_id uuid NOT NULL
);


--
-- Name: IncidentsBookmark; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."IncidentsBookmark" (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    provider character varying NOT NULL,
    entity_id uuid NOT NULL,
    bookmark timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    updated_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    entity_type character varying DEFAULT 'SERVICE'::character varying NOT NULL
);

--
-- Name: Integration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Integration" (
    created_at timestamp with time zone DEFAULT now(),
    org_id uuid NOT NULL,
    name character varying NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    generated_by uuid,
    access_token_enc_chunks character varying[],
    refresh_token_enc_chunks character varying[],
    scopes character varying[],
    provider_meta jsonb,
    access_token_valid_till timestamp with time zone
);

--
-- Name: OrgIncidentService; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OrgIncidentService" (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    provider character varying NOT NULL,
    key character varying NOT NULL,
    name character varying,
    org_id uuid NOT NULL,
    auto_resolve_timeout integer,
    created_by character varying,
    acknowledgement_timeout integer,
    status character varying,
    provider_team_keys character varying[],
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    updated_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    source_type character varying NOT NULL
);

--
-- Name: OrgRepo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OrgRepo" (
    org_id uuid,
    name character varying NOT NULL,
    provider character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    org_name character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    default_branch character varying,
    language character varying,
    contributors jsonb,
    idempotency_key character varying,
    slug character varying
);

--
-- Name: Organization; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Organization" (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    name character varying,
    domain character varying,
    other_domains character varying[]
);

--
-- Name: PullRequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PullRequest" (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    number character varying NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    author character varying NOT NULL,
    requested_reviews character varying[],
    data jsonb,
    state character varying NOT NULL,
    repo_id uuid,
    state_changed_at timestamp with time zone,
    first_response_time bigint,
    rework_time bigint,
    merge_time bigint,
    cycle_time bigint,
    base_branch character varying,
    head_branch character varying,
    title character varying,
    url text,
    meta jsonb DEFAULT '{}'::jsonb,
    provider character varying,
    reviewers character varying[],
    rework_cycles bigint DEFAULT '0'::bigint,
    first_commit_to_open bigint,
    merge_to_deploy bigint,
    lead_time bigint,
    merge_commit_sha character varying,
    created_in_db_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_in_db_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: COLUMN "PullRequest".meta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PullRequest".meta IS 'Pull request meta data';


--
-- Name: PullRequestCommit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PullRequestCommit" (
    hash character varying NOT NULL,
    pull_request_id uuid,
    url character varying,
    data jsonb,
    author character varying,
    org_repo_id uuid,
    created_at timestamp with time zone,
    message character varying,
    created_in_db_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_in_db_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: PullRequestEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PullRequestEvent" (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    pull_request_id uuid,
    type character varying,
    data jsonb,
    idempotency_key character varying,
    org_repo_id uuid,
    actor_username character varying,
    created_in_db_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_in_db_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: COLUMN "PullRequestEvent".org_repo_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PullRequestEvent".org_repo_id IS 'Cached repo id';


--
-- Name: PullRequestRevertPRMapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PullRequestRevertPRMapping" (
    pr_id uuid NOT NULL,
    actor_type character varying NOT NULL,
    actor uuid,
    reverted_pr uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

--
-- Name: RepoSyncLogs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RepoSyncLogs" (
    repo_id uuid NOT NULL,
    synced_at timestamp with time zone DEFAULT now()
);


--
-- Name: RepoWorkflow; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RepoWorkflow" (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    org_repo_id uuid NOT NULL,
    type character varying NOT NULL,
    provider character varying NOT NULL,
    provider_workflow_id character varying NOT NULL,
    created_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    updated_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    name character varying
);


--
-- Name: RepoWorkflowRuns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RepoWorkflowRuns" (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    repo_workflow_id uuid NOT NULL,
    provider_workflow_run_id character varying NOT NULL,
    status character varying,
    head_branch character varying,
    event_actor character varying,
    created_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    updated_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    conducted_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    duration integer,
    html_url character varying
);


--
-- Name: RepoWorkflowRunsBookmark; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RepoWorkflowRunsBookmark" (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    bookmark character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    repo_workflow_id uuid NOT NULL
);

--
-- Name: Settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Settings" (
    setting_type character varying NOT NULL,
    entity_type character varying NOT NULL,
    entity_id uuid NOT NULL,
    updated_by uuid,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL
);


--
-- Name: Team; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Team" (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    org_id uuid NOT NULL,
    name character varying,
    member_ids uuid[] NOT NULL,
    manager_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_deleted boolean DEFAULT false NOT NULL
);


--
-- Name: TeamIncidentService; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TeamIncidentService" (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    team_id uuid NOT NULL,
    service_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    updated_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL
);

--
-- Name: TeamRepos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TeamRepos" (
    team_id uuid NOT NULL,
    org_repo_id uuid NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    prod_branch character varying,
    prod_branches character varying[],
    deployment_type character varying DEFAULT 'PR_MERGE'::character varying NOT NULL
);


--
-- Name: UIPreferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UIPreferences" (
    setting_type character varying NOT NULL,
    entity_type character varying NOT NULL,
    entity_id uuid NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    setter_type character varying NOT NULL,
    setter_id uuid,
    created_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    updated_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL
);


--
-- Name: UserIdentity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserIdentity" (
    user_id uuid NOT NULL,
    provider character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    token character varying,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    org_id uuid NOT NULL,
    username character varying,
    refresh_token character varying,
    meta jsonb DEFAULT '{}'::jsonb
);

--
-- Name: Users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Users" (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    org_id uuid,
    name character varying NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    primary_email text NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    onboarding_state jsonb DEFAULT '{}'::jsonb NOT NULL,
    avatar_url character varying,
    role_override character varying
);


--
-- Name: COLUMN "Users".onboarding_state; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."Users".onboarding_state IS 'State JSON for storing the onboarding progress of a user';

--
-- Name: IncidentOrgIncidentServiceMap IncidentOrgIncidentServiceMap_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."IncidentOrgIncidentServiceMap"
    ADD CONSTRAINT "IncidentOrgIncidentServiceMap_pkey" PRIMARY KEY (incident_id, service_id);

--
-- Name: Incident Incident_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Incident"
    ADD CONSTRAINT "Incident_pkey" PRIMARY KEY (id);


--
-- Name: Incident Incident_provider_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Incident"
    ADD CONSTRAINT "Incident_provider_key" UNIQUE (provider, key);


--
-- Name: IncidentsBookmark IncidentsBookmark_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."IncidentsBookmark"
    ADD CONSTRAINT "IncidentsBookmark_pkey" PRIMARY KEY (id);


--
-- Name: IncidentsBookmark IncidentsBookmark_provider_entity_id_type_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."IncidentsBookmark"
    ADD CONSTRAINT "IncidentsBookmark_provider_entity_id_type_unique" UNIQUE (provider, entity_id, entity_type);


--
-- Name: Integration Integration_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Integration"
    ADD CONSTRAINT "Integration_pkey" PRIMARY KEY (name, org_id);

--
-- Name: OrgIncidentService OrgIncidentService_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrgIncidentService"
    ADD CONSTRAINT "OrgIncidentService_pkey" PRIMARY KEY (id);


--
-- Name: OrgIncidentService OrgIncidentService_provider_org_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrgIncidentService"
    ADD CONSTRAINT "OrgIncidentService_provider_org_id_key" UNIQUE (provider, org_id, key);


--
-- Name: OrgRepo OrgRepo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrgRepo"
    ADD CONSTRAINT "OrgRepo_pkey" PRIMARY KEY (id);

--
-- Name: Organization Organization_domain_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Organization"
    ADD CONSTRAINT "Organization_domain_key" UNIQUE (domain);


--
-- Name: Organization Organization_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Organization"
    ADD CONSTRAINT "Organization_pkey" PRIMARY KEY (id);

--
-- Name: PullRequestCommit PullRequestCommit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PullRequestCommit"
    ADD CONSTRAINT "PullRequestCommit_pkey" PRIMARY KEY (hash);


--
-- Name: PullRequestEvent PullRequestEvent_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PullRequestEvent"
    ADD CONSTRAINT "PullRequestEvent_idempotency_key_key" UNIQUE (idempotency_key);


--
-- Name: PullRequestEvent PullRequestEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PullRequestEvent"
    ADD CONSTRAINT "PullRequestEvent_pkey" PRIMARY KEY (id);

--
-- Name: RepoSyncLogs RepoSyncLogs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RepoSyncLogs"
    ADD CONSTRAINT "RepoSyncLogs_pkey" PRIMARY KEY (repo_id);


--
-- Name: RepoWorkflowRunsBookmark RepoWorkflowRunsBookmark_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RepoWorkflowRunsBookmark"
    ADD CONSTRAINT "RepoWorkflowRunsBookmark_pkey" PRIMARY KEY (id);


--
-- Name: RepoWorkflowRuns RepoWorkflowRuns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RepoWorkflowRuns"
    ADD CONSTRAINT "RepoWorkflowRuns_pkey" PRIMARY KEY (id);


--
-- Name: RepoWorkflow RepoWorkflow_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RepoWorkflow"
    ADD CONSTRAINT "RepoWorkflow_pkey" PRIMARY KEY (id);


--
-- Name: Settings Settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Settings"
    ADD CONSTRAINT "Settings_pkey" PRIMARY KEY (setting_type, entity_type, entity_id);


--
-- Name: TeamIncidentService TeamIncidentService_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeamIncidentService"
    ADD CONSTRAINT "TeamIncidentService_pkey" PRIMARY KEY (id);


--
-- Name: TeamIncidentService TeamIncidentService_team_id_service_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeamIncidentService"
    ADD CONSTRAINT "TeamIncidentService_team_id_service_id_key" UNIQUE (team_id, service_id);

--
-- Name: TeamRepos TeamRepos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeamRepos"
    ADD CONSTRAINT "TeamRepos_pkey" PRIMARY KEY (team_id, org_repo_id);


--
-- Name: Team Team_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Team"
    ADD CONSTRAINT "Team_pkey" PRIMARY KEY (id);


--
-- Name: UIPreferences UIPreferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UIPreferences"
    ADD CONSTRAINT "UIPreferences_pkey" PRIMARY KEY (setting_type, entity_type, entity_id);


--
-- Name: Users Users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_pkey" PRIMARY KEY (id);


--
-- Name: Users Users_primary_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_primary_email_key" UNIQUE (primary_email);


--
-- Name: BookmarkMergeToDeployBroker bookmark_mtdb_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BookmarkMergeToDeployBroker"
    ADD CONSTRAINT bookmark_mtdb_pkey PRIMARY KEY (repo_id);


--
-- Name: Bookmark bookmark_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Bookmark"
    ADD CONSTRAINT bookmark_pkey PRIMARY KEY (repo_id, type);


--
-- Name: BookmarkPullRequestRevertPRMapping bookmark_pull_request_revert_pr_mapping_repo_id_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BookmarkPullRequestRevertPRMapping"
    ADD CONSTRAINT bookmark_pull_request_revert_pr_mapping_repo_id_pkey PRIMARY KEY (repo_id);


--
-- Name: OrgRepo one_repo_per_provider; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrgRepo"
    ADD CONSTRAINT one_repo_per_provider UNIQUE (org_name, name, provider);


--
-- Name: OrgRepo orgrepo_unique_idempotency_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrgRepo"
    ADD CONSTRAINT orgrepo_unique_idempotency_key UNIQUE (idempotency_key);

--
-- Name: PullRequest pull_request_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PullRequest"
    ADD CONSTRAINT pull_request_pkey PRIMARY KEY (id);


--
-- Name: PullRequestRevertPRMapping pull_request_revert_pr_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PullRequestRevertPRMapping"
    ADD CONSTRAINT pull_request_revert_pr_mapping_pkey PRIMARY KEY (pr_id, actor_type);


--
-- Name: RepoWorkflowRuns repo_workflow_run_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RepoWorkflowRuns"
    ADD CONSTRAINT repo_workflow_run_unique UNIQUE (repo_workflow_id, provider_workflow_run_id);

--
-- Name: Incident_key_provider_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Incident_key_provider_index" ON public."Incident" USING btree (key, provider);


--
-- Name: IncidentsBookmark_provider_entity_id_entity_type_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IncidentsBookmark_provider_entity_id_entity_type_index" ON public."IncidentsBookmark" USING btree (provider, entity_id, entity_type);


--
-- Name: OrgIncidentService_key_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrgIncidentService_key_index" ON public."OrgIncidentService" USING btree (key);


--
-- Name: OrgIncidentService_org_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrgIncidentService_org_id_index" ON public."OrgIncidentService" USING btree (org_id);


--
-- Name: TeamIncidentService_team_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TeamIncidentService_team_id_index" ON public."TeamIncidentService" USING btree (team_id);


--
-- Name: Team_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Team_org_idx" ON public."Team" USING btree (org_id);


--
-- Name: incident_resolved_date_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX incident_resolved_date_index ON public."Incident" USING btree (resolved_date);


--
-- Name: incidentorgincidentservicemap_service_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX incidentorgincidentservicemap_service_id ON public."IncidentOrgIncidentServiceMap" USING btree (service_id);


--
-- Name: org_repo_fetch_active_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_repo_fetch_active_index ON public."OrgRepo" USING btree (org_id, is_active);


--
-- Name: org_repo_search_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_repo_search_index ON public."OrgRepo" USING btree (org_id, name);


--
-- Name: orgnanization_domain_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orgnanization_domain_index ON public."Organization" USING btree (domain);


--
-- Name: orgnanization_other_domains_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orgnanization_other_domains_index ON public."Organization" USING btree (other_domains);


--
-- Name: pull_request_author_created_fetch_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pull_request_author_created_fetch_index ON public."PullRequest" USING btree (author, created_at);


--
-- Name: pull_request_cycle_created_fetch_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pull_request_cycle_created_fetch_index ON public."PullRequest" USING btree (cycle_time, created_at DESC);


--
-- Name: pull_request_event_fetch_reviews_stats; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pull_request_event_fetch_reviews_stats ON public."PullRequestEvent" USING btree (org_repo_id, created_at);


--
-- Name: pull_request_event_review_fetch_index_new; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pull_request_event_review_fetch_index_new ON public."PullRequestEvent" USING btree (actor_username, type, created_at);


--
-- Name: pull_request_event_reviews_fetch_index_new; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pull_request_event_reviews_fetch_index_new ON public."PullRequestEvent" USING btree (pull_request_id, type, created_at);


--
-- Name: pull_request_event_search_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pull_request_event_search_index ON public."PullRequestEvent" USING btree (pull_request_id);


--
-- Name: pull_request_for_author_closed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pull_request_for_author_closed ON public."PullRequest" USING btree (author, state_changed_at, state);


--
-- Name: pull_request_for_metrics_by_repos_by_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pull_request_for_metrics_by_repos_by_created ON public."PullRequest" USING btree (repo_id, created_at);


--
-- Name: pull_request_repo_id_number_unique_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pull_request_repo_id_number_unique_index ON public."PullRequest" USING btree (repo_id, number);


--
-- Name: pull_request_repo_interval_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pull_request_repo_interval_index ON public."PullRequest" USING btree (repo_id, state_changed_at, created_at);


--
-- Name: pull_request_state_changed_interval_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pull_request_state_changed_interval_index ON public."PullRequest" USING btree (repo_id, state_changed_at, state);


--
-- Name: pullrequest_author_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pullrequest_author_index ON public."PullRequest" USING btree (author);


--
-- Name: pullrequest_base_branch_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pullrequest_base_branch_index ON public."PullRequest" USING btree (base_branch);


--
-- Name: pullrequest_cycle_time_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pullrequest_cycle_time_index ON public."PullRequest" USING btree (cycle_time);


--
-- Name: pullrequest_state_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pullrequest_state_index ON public."PullRequest" USING btree (state);


--
-- Name: repoworkflow_id_pkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX repoworkflow_id_pkey ON public."RepoWorkflow" USING btree (id);


--
-- Name: repoworkflow_orgrepo_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX repoworkflow_orgrepo_type ON public."RepoWorkflow" USING btree (org_repo_id, type);


--
-- Name: repoworkflow_orgrepo_type_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX repoworkflow_orgrepo_type_is_active ON public."RepoWorkflow" USING btree (org_repo_id, type, is_active);


--
-- Name: repoworkflow_orgrepoid_provider_workflow_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX repoworkflow_orgrepoid_provider_workflow_id ON public."RepoWorkflow" USING btree (org_repo_id, provider_workflow_id);


--
-- Name: repoworkflow_providerworkflowid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX repoworkflow_providerworkflowid ON public."RepoWorkflow" USING btree (provider_workflow_id);


--
-- Name: repoworkflowruns_id_pkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX repoworkflowruns_id_pkey ON public."RepoWorkflowRuns" USING btree (id);


--
-- Name: repoworkflowruns_providerid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX repoworkflowruns_providerid ON public."RepoWorkflowRuns" USING btree (provider_workflow_run_id);


--
-- Name: repoworkflowruns_workflowid_conducted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX repoworkflowruns_workflowid_conducted_at ON public."RepoWorkflowRuns" USING btree (repo_workflow_id, conducted_at);


--
-- Name: repoworkflowrunsbookmark_id_pkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX repoworkflowrunsbookmark_id_pkey ON public."RepoWorkflowRunsBookmark" USING btree (id);


--
-- Name: repoworkflowrunsbookmark_repo_workflow_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX repoworkflowrunsbookmark_repo_workflow_id ON public."RepoWorkflowRunsBookmark" USING btree (repo_workflow_id);


--
-- Name: settings_unique_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX settings_unique_index ON public."Settings" USING btree (setting_type, entity_type, entity_id);


--
-- Name: team_nam_orgid_isdel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX team_nam_orgid_isdel ON public."Team" USING btree (name, org_id, is_deleted);


--
-- Name: team_repos_fetch_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX team_repos_fetch_index ON public."TeamRepos" USING btree (team_id, is_active);


--
-- Name: teamincidentservice_service_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX teamincidentservice_service_id ON public."TeamIncidentService" USING btree (service_id);


--
-- Name: teamrepos_org_repo_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX teamrepos_org_repo_id_index ON public."TeamRepos" USING btree (org_repo_id);


--
-- Name: uipreferences_unique_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uipreferences_unique_index ON public."Settings" USING btree (setting_type, entity_type, entity_id);

--
-- Name: user_identity_fetch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_identity_fetch ON public."UserIdentity" USING btree (username);


--
-- Name: user_org_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_org_id_index ON public."Users" USING btree (org_id);


--
-- Name: user_primary_email_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_primary_email_index ON public."Users" USING btree (primary_email);


--
-- Name: useridentity_userid_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX useridentity_userid_provider ON public."UserIdentity" USING btree (user_id, provider);


--
-- Name: BookmarkMergeToDeployBroker BookmarkMergeToDeployBroker_repo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BookmarkMergeToDeployBroker"
    ADD CONSTRAINT "BookmarkMergeToDeployBroker_repo_id_fkey" FOREIGN KEY (repo_id) REFERENCES public."OrgRepo"(id);


--
-- Name: Bookmark Bookmark_repo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Bookmark"
    ADD CONSTRAINT "Bookmark_repo_id_fkey" FOREIGN KEY (repo_id) REFERENCES public."OrgRepo"(id);

--
-- Name: IncidentOrgIncidentServiceMap IncidentOrgIncidentServiceMap_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."IncidentOrgIncidentServiceMap"
    ADD CONSTRAINT "IncidentOrgIncidentServiceMap_incident_id_fkey" FOREIGN KEY (incident_id) REFERENCES public."Incident"(id);


--
-- Name: IncidentOrgIncidentServiceMap IncidentOrgIncidentServiceMap_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."IncidentOrgIncidentServiceMap"
    ADD CONSTRAINT "IncidentOrgIncidentServiceMap_service_id_fkey" FOREIGN KEY (service_id) REFERENCES public."OrgIncidentService"(id);


--
-- Name: Integration Integration_generated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Integration"
    ADD CONSTRAINT "Integration_generated_by_fkey" FOREIGN KEY (generated_by) REFERENCES public."Users"(id);


--
-- Name: Integration Integration_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Integration"
    ADD CONSTRAINT "Integration_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public."Organization"(id);


--
-- Name: OrgIncidentService OrgIncidentService_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrgIncidentService"
    ADD CONSTRAINT "OrgIncidentService_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public."Organization"(id) ON DELETE CASCADE;

--
-- Name: OrgRepo OrgRepo_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrgRepo"
    ADD CONSTRAINT "OrgRepo_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public."Organization"(id);


--
-- Name: PullRequestCommit PullRequestCommit_org_repo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PullRequestCommit"
    ADD CONSTRAINT "PullRequestCommit_org_repo_id_fkey" FOREIGN KEY (org_repo_id) REFERENCES public."OrgRepo"(id);


--
-- Name: PullRequestCommit PullRequestCommit_pull_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PullRequestCommit"
    ADD CONSTRAINT "PullRequestCommit_pull_request_id_fkey" FOREIGN KEY (pull_request_id) REFERENCES public."PullRequest"(id);


--
-- Name: PullRequestEvent PullRequestEvent_org_repo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PullRequestEvent"
    ADD CONSTRAINT "PullRequestEvent_org_repo_id_fkey" FOREIGN KEY (org_repo_id) REFERENCES public."OrgRepo"(id);


--
-- Name: PullRequestEvent PullRequestEvent_pull_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PullRequestEvent"
    ADD CONSTRAINT "PullRequestEvent_pull_request_id_fkey" FOREIGN KEY (pull_request_id) REFERENCES public."PullRequest"(id);


--
-- Name: PullRequest PullRequest_repo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PullRequest"
    ADD CONSTRAINT "PullRequest_repo_id_fkey" FOREIGN KEY (repo_id) REFERENCES public."OrgRepo"(id);


--
-- Name: RepoSyncLogs RepoSyncLogs_repo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RepoSyncLogs"
    ADD CONSTRAINT "RepoSyncLogs_repo_id_fkey" FOREIGN KEY (repo_id) REFERENCES public."OrgRepo"(id);


--
-- Name: RepoWorkflowRunsBookmark RepoWorkflowRunsBookmark_Workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RepoWorkflowRunsBookmark"
    ADD CONSTRAINT "RepoWorkflowRunsBookmark_Workflow_id_fkey" FOREIGN KEY (repo_workflow_id) REFERENCES public."RepoWorkflow"(id);


--
-- Name: RepoWorkflowRuns RepoWorkflowRuns_Workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RepoWorkflowRuns"
    ADD CONSTRAINT "RepoWorkflowRuns_Workflow_id_fkey" FOREIGN KEY (repo_workflow_id) REFERENCES public."RepoWorkflow"(id);


--
-- Name: RepoWorkflow RepoWorkflow_OrgRepo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RepoWorkflow"
    ADD CONSTRAINT "RepoWorkflow_OrgRepo_id_fkey" FOREIGN KEY (org_repo_id) REFERENCES public."OrgRepo"(id);


--
-- Name: Settings Settings_updated_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Settings"
    ADD CONSTRAINT "Settings_updated_by_user_id_fkey" FOREIGN KEY (updated_by) REFERENCES public."Users"(id);


--
-- Name: TeamIncidentService TeamIncidentService_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeamIncidentService"
    ADD CONSTRAINT "TeamIncidentService_service_id_fkey" FOREIGN KEY (service_id) REFERENCES public."OrgIncidentService"(id) ON DELETE CASCADE;


--
-- Name: TeamIncidentService TeamIncidentService_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeamIncidentService"
    ADD CONSTRAINT "TeamIncidentService_team_id_fkey" FOREIGN KEY (team_id) REFERENCES public."Team"(id) ON DELETE CASCADE;


--
-- Name: TeamRepos TeamRepos_org_repo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeamRepos"
    ADD CONSTRAINT "TeamRepos_org_repo_id_fkey" FOREIGN KEY (org_repo_id) REFERENCES public."OrgRepo"(id);


--
-- Name: TeamRepos TeamRepos_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeamRepos"
    ADD CONSTRAINT "TeamRepos_team_id_fkey" FOREIGN KEY (team_id) REFERENCES public."Team"(id);


--
-- Name: Team Team_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Team"
    ADD CONSTRAINT "Team_manager_id_fkey" FOREIGN KEY (manager_id) REFERENCES public."Users"(id);


--
-- Name: Team Team_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Team"
    ADD CONSTRAINT "Team_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public."Organization"(id);


--
-- Name: UIPreferences UIPreferences_setter_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UIPreferences"
    ADD CONSTRAINT "UIPreferences_setter_user_id_fkey" FOREIGN KEY (setter_id) REFERENCES public."Users"(id);


--
-- Name: UserIdentity UserIdentity_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserIdentity"
    ADD CONSTRAINT "UserIdentity_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public."Organization"(id);


--
-- Name: UserIdentity UserIdentity_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserIdentity"
    ADD CONSTRAINT "UserIdentity_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id);


--
-- Name: Users Users_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public."Organization"(id);


--
-- Name: BookmarkPullRequestRevertPRMapping bookmark_pull_request_revert_pr_mapping_id_repo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BookmarkPullRequestRevertPRMapping"
    ADD CONSTRAINT bookmark_pull_request_revert_pr_mapping_id_repo_id_fkey FOREIGN KEY (repo_id) REFERENCES public."OrgRepo"(id);


--
-- Name: PullRequestRevertPRMapping pull_request_revert_pr_mapping_actor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PullRequestRevertPRMapping"
    ADD CONSTRAINT pull_request_revert_pr_mapping_actor_fkey FOREIGN KEY (actor) REFERENCES public."Users"(id);


--
-- Name: PullRequestRevertPRMapping pull_request_revert_pr_mapping_pr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PullRequestRevertPRMapping"
    ADD CONSTRAINT pull_request_revert_pr_mapping_pr_id_fkey FOREIGN KEY (pr_id) REFERENCES public."PullRequest"(id);


--
-- Name: PullRequestRevertPRMapping pull_request_revert_pr_mapping_reverted_pr_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PullRequestRevertPRMapping"
    ADD CONSTRAINT pull_request_revert_pr_mapping_reverted_pr_fkey FOREIGN KEY (reverted_pr) REFERENCES public."PullRequest"(id);



-- migrate:down