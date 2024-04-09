from queue import Queue
from threading import Thread

from github import Organization

from dora.utils.log import LOG


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
