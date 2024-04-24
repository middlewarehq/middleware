import { objectEnum, objectEnumFromFn } from '@/utils/enum';

enum TableT {
  AppConfigTypes,
  Bookmark,
  Integration,
  Incident,
  Organization,
  OrgRepo,
  OrgSettings,
  RepoWorkflow,
  RepoWorkflowRuns,
  PullRequest,
  PullRequestEvent,
  Team,
  TeamRelations,
  TeamRepos,
  UserIdentity,
  Users,
  Action,
  InternalAdminSettings,
  OneOnOne,
  OneOnOneCareerPath,
  OneOnOneItems,
  OneOnOneItemComments,
  OneOnOneNotes,
  OneOnOneUserGrowth,
  OneOnOneConfig,
  PinnedUsers,
  OrgPOCs,
  OrgProject,
  Review,
  Response,
  TeamProjects,
  OrgIncidentService,
  FeedbackCycle,
  Tickets,
  TicketState,
  UserActivity,
  UIPreferences,
  URLShortenerData
}

export const Table = objectEnum(TableT);

export const Columns = {
  [Table.Organization]: objectEnumFromFn(() => {
    enum Columns {
      id,
      created_at,
      name,
      domain,
      other_domains
    }
    return Columns;
  }),
  [Table.TeamRelations]: objectEnumFromFn(() => {
    enum Columns {
      created_at,
      updated_at,
      user_id,
      relation,
      related_user_id,
      org_id
    }
    return Columns;
  }),
  [Table.UserIdentity]: objectEnumFromFn(() => {
    enum Columns {
      created_at,
      updated_at,
      user_id,
      org_id,
      username,
      token,
      refresh_token,
      provider,
      meta
    }
    return Columns;
  }),
  [Table.Users]: objectEnumFromFn(() => {
    enum Columns {
      id,
      created_at,
      updated_at,
      org_id,
      name,
      primary_email,
      is_deleted,
      onboarding_state
    }
    return Columns;
  }),
  [Table.Integration]: objectEnumFromFn(() => {
    enum Columns {
      id,
      created_at,
      updated_at,
      org_id,
      name,
      generated_by,
      access_token_enc_chunks,
      refresh_token_enc_chunks,
      provider_meta,
      scopes,
      access_token_valid_till
    }
    return Columns;
  }),
  [Table.OrgRepo]: objectEnumFromFn(() => {
    enum Columns {
      id,
      created_at,
      updated_at,
      org_id,
      name,
      org_name,
      provider,
      is_active,
      default_branch,
      language,
      idempotency_key,
      slug
    }
    return Columns;
  }),
  [Table.Team]: objectEnumFromFn(() => {
    enum Columns {
      id,
      created_at,
      updated_at,
      org_id,
      name,
      manager_id,
      member_ids,
      is_deleted
    }
    return Columns;
  }),
  [Table.TeamRepos]: objectEnumFromFn(() => {
    enum Columns {
      team_id,
      created_at,
      updated_at,
      is_active,
      org_repo_id,
      prod_branch,
      prod_branches,
      deployment_type
    }
    return Columns;
  }),
  [Table.Action]: objectEnumFromFn(() => {
    enum Columns {
      id,
      team_ids,
      org_id,
      created_at,
      updated_at,
      type,
      actor,
      context,
      data,
      is_deleted,
      numeric_id
    }
    return Columns;
  }),
  [Table.InternalAdminSettings]: objectEnumFromFn(() => {
    enum Columns {
      id,
      created_at,
      key,
      value
    }
    return Columns;
  }),
  [Table.OneOnOne]: objectEnumFromFn(() => {
    enum Columns {
      id,
      manager_id,
      reportee_id,
      scheduled_at,
      conducted_at,
      created_at,
      updated_at
    }
    return Columns;
  }),
  [Table.OneOnOneCareerPath]: objectEnumFromFn(() => {
    enum Columns {
      user_id,
      current_title,
      new_title,
      created_at,
      updated_at
    }
    return Columns;
  }),
  [Table.OneOnOneItemComments]: objectEnumFromFn(() => {
    enum Columns {
      id,
      item_id,
      comment,
      created_by,
      created_at,
      updated_at,
      is_deleted,
      deleted_at
    }
    return Columns;
  }),
  [Table.OneOnOneItems]: objectEnumFromFn(() => {
    enum Columns {
      id,
      oneonone_id,
      title,
      description,
      item_type,
      owner_id,
      parent_oneonone_id,
      due_date,
      oneonone_trail,
      created_at,
      updated_at,
      state,
      completed_at,
      author_id,
      is_archived,
      archived_at
    }
    return Columns;
  }),
  [Table.OneOnOneNotes]: objectEnumFromFn(() => {
    enum Columns {
      user_id,
      oneonone_id,
      notes,
      created_at,
      updated_at
    }
    return Columns;
  }),
  [Table.OneOnOneUserGrowth]: objectEnumFromFn(() => {
    enum Columns {
      id,
      user_id,
      title,
      description,
      percentage_completion,
      state,
      item_type,
      updated_by,
      created_at,
      updated_at,
      due_date,
      completed_at
    }
    return Columns;
  }),
  [Table.OneOnOneConfig]: objectEnumFromFn(() => {
    enum Columns {
      org_id,
      default_frequency,
      carry_over_config,
      user_growth_config,
      created_at,
      updated_at
    }
    return Columns;
  }),
  [Table.PinnedUsers]: objectEnumFromFn(() => {
    enum Columns {
      pinned_user_id,
      user_id,
      notes,
      is_deleted,
      deleted_at,
      created_at,
      updated_at
    }
    return Columns;
  }),
  [Table.OrgPOCs]: objectEnumFromFn(() => {
    enum Columns {
      org_id,
      poc_user_ids,
      created_at,
      updated_at
    }
    return Columns;
  }),
  [Table.OrgProject]: objectEnumFromFn(() => {
    enum Columns {
      id,
      created_at,
      updated_at,
      org_id,
      name,
      key,
      org_name,
      provider,
      is_active
    }
    return Columns;
  }),
  [Table.TeamProjects]: objectEnumFromFn(() => {
    enum Columns {
      team_id,
      created_at,
      updated_at,
      is_active,
      org_project_id
    }
    return Columns;
  }),
  [Table.RepoWorkflow]: objectEnumFromFn(() => {
    enum Columns {
      id,
      org_repo_id,
      type,
      provider,
      provider_workflow_id,
      created_at,
      updated_at,
      meta,
      is_active,
      name
    }
    return Columns;
  }),
  [Table.OrgIncidentService]: objectEnumFromFn(() => {
    enum Columns {
      id,
      provider,
      key,
      name,
      org_id,
      auto_resolve_timeout,
      created_by,
      acknowledgement_timeout,
      status,
      provider_team_keys,
      meta,
      created_at,
      updated_at,
      is_deleted,
      source_type
    }
    return Columns;
  }),
  [Table.FeedbackCycle]: objectEnumFromFn(() => {
    enum Columns {
      id,
      name,
      org_id,
      description,
      start_date,
      end_date,
      created_by,
      updated_by,
      created_at,
      updated_at,
      is_deleted,
      state,
      review_observers
    }
    return Columns;
  }),
  [Table.Tickets]: objectEnumFromFn(() => {
    enum Columns {
      id,
      created_at,
      updated_at,
      title,
      type,
      status,
      story_points,
      number,
      key,
      project,
      priority,
      reporter,
      assignee,
      raw_data,
      project_id,
      is_complete,
      url,
      current_sprint,
      sprint_history,
      meta,
      parent_key
    }

    return Columns;
  }),
  [Table.TicketState]: objectEnumFromFn(() => {
    enum Columns {
      id,
      ticket_id,
      state,
      from_time,
      to_time,
      time_spent,
      idempotency_key,
      created_at,
      updated_at
    }

    return Columns;
  }),
  Settings: objectEnumFromFn(() => {
    enum Columns {
      setting_type,
      entity_type,
      entity_id,
      updated_by,
      data,
      created_at,
      updated_at,
      is_deleted
    }

    return Columns;
  }),
  [Table.UserActivity]: objectEnumFromFn(() => {
    enum Columns {
      user_id,
      created_at,
      updated_at,
      activity_type,
      activity_data,
      is_deleted,
      id,
      impersonated_by
    }

    return Columns;
  }),
  [Table.UIPreferences]: objectEnumFromFn(() => {
    enum Columns {
      entity_type,
      entity_id,
      setting_type,
      data,
      setter_type,
      setter_id,
      created_at,
      updated_at
    }
    return Columns;
  }),
  [Table.URLShortenerData]: objectEnumFromFn(() => {
    enum Columns {
      id,
      url_json_string,
      created_at,
      updated_at,
      meta,
      is_deleted
    }
    return Columns;
  }),
  [Table.PullRequest]: objectEnumFromFn(() => {
    enum Columns {
      id,
      created_at,
      number,
      updated_at,
      author,
      requested_reviews,
      data,
      state,
      repo_id,
      state_changed_at,
      first_response_time,
      rework_time,
      merge_time,
      cycle_time,
      base_branch,
      head_branch,
      title,
      url,
      meta,
      provider,
      reviewers,
      rework_cycles,
      first_commit_to_open,
      merge_to_deploy,
      lead_time
    }
    return Columns;
  }),
  [Table.Incident]: objectEnumFromFn(() => {
    enum Columns {
      id,
      provider,
      key,
      service_id,
      incident_number,
      status,
      title,
      acknowledged_date,
      resolved_date,
      assigned_to,
      created_at,
      updated_at,
      meta,
      creation_date,
      assignees,
      incident_type
    }
    return Columns;
  }),
  [Table.RepoWorkflowRuns]: objectEnumFromFn(() => {
    enum Columns {
      id,
      repo_workflow_id,
      provider_workflow_run_id,
      status,
      head_branch,
      event_actor,
      created_at,
      updated_at,
      conducted_at,
      meta
    }
    return Columns;
  }),
  [Table.Review]: objectEnumFromFn(() => {
    enum Columns {
      id,
      questionnaire_id,
      state,
      recipient_email,
      reviewer_email,
      created_at,
      updated_at,
      is_deleted,
      anonymous
    }
    return Columns;
  })
};

export type Row<T extends keyof typeof Columns> = Record<
  keyof (typeof Columns)[T],
  any
>;

export type RowK<T extends keyof typeof Columns> = keyof Row<T>;

export const colstr = <T extends keyof typeof Columns>(
  _table: T,
  str: RowK<T>[]
) => str.join(',');

/**
 * Same as `colstr`, just in a different args set
 * @param _table just for type safety
 * @param str column name params
 * @returns column names joined by ','
 */
export const cols = <T extends keyof typeof Columns>(
  _table: T,
  ...str: RowK<T>[]
) => str.join(',');
