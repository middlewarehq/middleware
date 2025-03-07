import Docker from 'dockerode';

const docker = new Docker();

// Cache container for quick status check
class ContainerCache {
  private cache = new Map<string, { status: boolean; timestamp: number }>();
  private TTL = 30000;

  has(containerId: string): boolean {
    const entry = this.cache.get(containerId);
    return entry !== undefined && Date.now() - entry.timestamp < this.TTL;
  }

  get(containerId: string): boolean | null {
    const entry = this.cache.get(containerId);
    if (!entry) return null;

    if (Date.now() - entry.timestamp < this.TTL) {
      return entry.status;
    }

    this.cache.delete(containerId);
    return null;
  }

  set(containerId: string, status: boolean): void {
    this.cache.set(containerId, {
      status,
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

const containerStatusCache = new ContainerCache();

// Container Rebuild logic
export const shouldRebuildContainers = (): boolean => {
  const skipRebuild = process.env['SKIP_CONTAINER_REBUILD'] === 'true';
  const isDev = process.env['NODE_ENV'] === 'development';
  return !(skipRebuild && isDev);
};

export const containerExistsAndRunning = async (
  containerId: string
): Promise<boolean> => {
  if (containerStatusCache.has(containerId)) {
    return containerStatusCache.get(containerId)!;
  }

  try {
    const container = docker.getContainer(containerId);
    const data = await container.inspect();
    const isRunning = data.State.Running;
    containerStatusCache.set(containerId, isRunning);
    return isRunning;
  } catch {
    containerStatusCache.set(containerId, false);
    return false;
  }
};

export const clearContainerCache = () => containerStatusCache.clear();
