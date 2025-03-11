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
export const shouldRebuildContainers = async (
  containerId: string = 'middleware-dev'
): Promise<boolean> => {
  const skipRebuild = process.env['SKIP_CONTAINER_REBUILD'] === 'true';
  const isDev = process.env['NODE_ENV'] === 'development';

  if (skipRebuild && isDev) {
    return false;
  }

  try {
    // Check if container exists and is running
    const isRunning = await containerExistsAndRunning(containerId);
    if (isRunning) {
      const container = docker.getContainer(containerId);
      const data = await container.inspect();

      // If container in healthy and dev mode, avoid rebuild
      if (isDev && data.State.Health?.Status === 'healthy') {
        return false;
      }

      if (data.State.Health?.Status === 'unhealthy') {
        return true;
      }
    }

    return true;
  } catch (error) {
    return true;
  }
};

export const shouldOnlyRestartApp = async (
  containerId: string = 'middleware-dev'
): Promise<boolean> => {
  const isDev = process.env['NODE_ENV'] === 'development';
  if (!isDev) return false;

  try {
    const isRunning = await containerExistsAndRunning(containerId);
    if (!isRunning) return false;

    const container = docker.getContainer(containerId);
    const data = await container.inspect();

    return data.State.Health?.Status === 'healthy';
  } catch {
    return false;
  }
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
