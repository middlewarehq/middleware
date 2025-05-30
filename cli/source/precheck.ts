import { isFreePort } from 'find-free-ports';

async function run(): Promise<void> {
  const { DB_PORT, REDIS_PORT, PORT, SYNC_SERVER_PORT, ANALYTICS_SERVER_PORT } =
    process.env;

  const rawPorts = [
    DB_PORT,
    REDIS_PORT,
    PORT,
    SYNC_SERVER_PORT,
    ANALYTICS_SERVER_PORT
  ];
  const ports: number[] = rawPorts.map((p, i) => {
    const num = Number(p);
    if (typeof p !== 'string' || Number.isNaN(num)) {
      console.error(`❌  Invalid or missing port value at index ${i}:`, p);
      process.exit(1);
    }
    return num;
  });

  try {
    const results = await Promise.allSettled(ports.map(isFreePort));
    results.forEach((result, i) => {
      const port = ports[i];
      if (result.status === 'rejected') {
        console.error(`❌  Failed to check port ${port}:`, result.reason);
        process.exit(1);
      } else if (!result.value) {
        console.error(`❌  Port ${port} is already in use.`);
        process.exit(1);
      }
    });

    console.log('✅  All ports are free; starting app...');
  } catch (err) {
    console.error('❌  Error checking ports:', err);
    process.exit(1);
  }
}

run();
