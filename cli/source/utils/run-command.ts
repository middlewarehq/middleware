import {
  spawn,
  SpawnOptionsWithoutStdio,
  ChildProcessWithoutNullStreams
} from 'child_process';

import CircularBuffer from './circularBuffer.js';
import { LogSource, READY_MESSAGES } from '../constants.js';

export function runCommand(
  command: string,
  args: string[],
  opts: {
    onData?: (data: string) => any;
    onErr?: (data: string) => any;
    options?: SpawnOptionsWithoutStdio;
    log_buffer?: CircularBuffer<string>;
  } = {}
): {
  process: ChildProcessWithoutNullStreams | null;
  promise: Promise<number>;
} {
  let process: ChildProcessWithoutNullStreams | null = null;
  const promise = new Promise<number>((resolve, reject) => {
    process = spawn(command, args, opts.options);

    process.stdout.on('data', (data) => {
      opts.onData?.(String(data));
      opts.log_buffer?.enqueue(String(data));
    });

    process.stderr.on('data', (data) => {
      opts.onErr?.(String(data));
      opts.log_buffer?.enqueue(String(data));
    });

    process.on('close', (code) => {
      const logs = opts.log_buffer?.items;
      if (logs)
        for (const log of logs) {
          if (
            READY_MESSAGES[LogSource.DockerWatchProcessIdLock].some(
              (lock_msg) => log.includes(lock_msg)
            )
          ) {
            resolve(1);
          }
        }

      if (code === 0) {
        resolve(code);
      } else {
        reject(
          new Error(
            `Process exited with code ${code}\n${command} ${args.join(' ')}`
          )
        );
      }
    });

    process.on('error', (err) => {
      reject(err);
    });
  });

  return { process, promise };
}
