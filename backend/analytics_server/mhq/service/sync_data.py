from mhq.service.code import sync_code_repos
from mhq.service.incidents import sync_org_incidents
from mhq.service.merge_to_deploy_broker import process_merge_to_deploy_cache
from mhq.service.query_validator import get_query_validator
from mhq.service.workflows import sync_org_workflows
from mhq.utils.lock import get_redis_lock_service
from mhq.utils.log import LOG

sync_sequence = [
    sync_code_repos,
    sync_org_workflows,
    process_merge_to_deploy_cache,
    sync_org_incidents,
]


def trigger_data_sync(org_id: str):
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
    default_org = get_query_validator().get_default_org()
    if not default_org:
        raise Exception("Default org not found")
    org_id = str(default_org.id)
    with get_redis_lock_service().acquire_lock("{org}:" + f"{str(org_id)}:data_sync"):
        try:
            trigger_data_sync(org_id)
        except Exception as e:
            LOG.error(f"Error syncing data for org {org_id}: {str(e)}")
