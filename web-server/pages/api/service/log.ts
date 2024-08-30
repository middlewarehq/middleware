import * as yup from 'yup';

import { exec } from 'child_process';

import { Endpoint, nullSchema } from '@/api-helpers/global';

const endpoint = new Endpoint(nullSchema);
const getLogsSchema = yup.object().shape({
  serviceName: yup.string().required('Service name is required')
});

const fetchDockerLogs = (
  command: string,
  callback: (err: any, logs: string[]) => void
) => {
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing Docker command: ${error.message}`);
      callback(error, []);
      return;
    }
    if (stderr) {
      console.error(`Error in Docker command output: ${stderr}`);
      callback(stderr, []);
      return;
    }

    const logs = stdout.split('\n').filter((line) => line.trim() !== ''); // Filter empty lines
    callback(null, logs);
  });
};

endpoint.handle.GET(getLogsSchema, async (req, res) => {
  const { serviceName } = req.payload;

  const commandMap: Record<string, string> = {
    'api-server-service':
      'cd ../../.. && cd /var/log/apiserver/ && tail -n 500 apiserver.log',
    'sync-server-service':
      'cd ../../.. && cd /var/log/sync_server/ && tail -n 500 sync_server.log',
    'redis-service':
      'cd ../../.. && cd /var/log/redis/ && tail -n 500 redis.log',
    'postgres-service':
      'cd ../../.. && cd /var/log/postgres/ && tail -n 500 postgres.log'
  };

  const command = commandMap[serviceName as keyof typeof commandMap];

  if (!command) {
    return res.status(400).json({ error: 'Invalid service name' });
  }

  fetchDockerLogs(command, (err, logs) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch logs' });
    }

    res.send({ logs });
  });
});

export default endpoint.serve();
