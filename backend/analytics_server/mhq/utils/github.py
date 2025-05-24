from queue import Queue
from threading import Thread
from typing import Optional

from github import Organization

from mhq.utils.log import LOG
from mhq.store.repos.core import CoreRepoService
from mhq.store.models import UserIdentityProvider


def github_org_data_multi_thread_worker(orgs: [Organization]) -> dict:
    class Worker(Thread):
        def __init__(self, request_queue: Queue):
            Thread.__init__(self)
            self.queue = request_queue
            self.results = {}

        def run(self):
            while True:
                if self.queue.empty():
                    break
                org = self.queue.get()
                try:
                    repos = list(org.get_repos().get_page(0)[:5])
                except Exception as e:
                    LOG.warn(f"Error while fetching github data for {org.name}: {e}")
                    self.queue.task_done()
                    continue
                self.results[org.name] = {
                    "repos": [repo.name for repo in repos],
                }
                self.queue.task_done()

    q = Queue()
    num_of_workers = len(orgs)
    for org in orgs:
        q.put(org)

    workers = []
    for _ in range(num_of_workers):
        worker = Worker(q)
        worker.start()
        workers.append(worker)

    for worker in workers:
        worker.join()

    # Combine results from all workers
    r = {}
    for worker in workers:
        r.update(worker.results)
    return r


def get_custom_github_domain(org_id: str) -> Optional[str]:
    core_repo_service = CoreRepoService()
    integrations = core_repo_service.get_org_integrations_for_names(
        org_id, [UserIdentityProvider.GITHUB.value]
    )

    github_domain = (
        integrations[0].provider_meta.get("custom_domain")
        if integrations[0].provider_meta
        else None
    )

    if not github_domain:
        LOG.warn(
            f"Custom domain not found for intergration for org {org_id} and provider {UserIdentityProvider.GITHUB.value}"
        )
        # return nothing when custom domain is not found
        # this is to prevent the default domain from being used
        return

    return github_domain
