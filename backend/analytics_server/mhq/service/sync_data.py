from mhq.service.code import sync_code_repos
from mhq.service.incidents import sync_org_incidents
from mhq.service.merge_to_deploy_broker import process_merge_to_deploy_cache
from mhq.service.query_validator import get_query_validator
from mhq.service.workflows import sync_org_workflows
from mhq.utils.log import LOG

sync_sequence = [
    sync_code_repos,
    sync_org_workflows,
    process_merge_to_deploy_cache,
    sync_org_incidents,
]


def trigger_data_sync():
    default_org = get_query_validator().get_default_org()
    org_id = str(default_org.id)
    LOG.info(f"Starting data sync for org {org_id}")

    for sync_func in sync_sequence:
        try:
            sync_func(org_id)
            LOG.info(f"Data sync for {sync_func.__name__} completed successfully")
        except Exception as e:
            LOG.error(
                f"Error syncing {sync_func.__name__} data for org {org_id}: {str(e)}"
            )
            continue
    LOG.info(f"Data sync for org {org_id} completed successfully")


if __name__ == "__main__":
    trigger_data_sync()
