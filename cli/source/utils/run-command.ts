import {
  spawn,
  SpawnOptionsWithoutStdio,
  ChildProcessWithoutNullStreams
} from 'child_process';

export function runCommand(
  command: string,
  args: string[],
  opts: {
    onData?: (data: string) => any;
    onErr?: (data: string) => any;
    options?: SpawnOptionsWithoutStdio;
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
    });

    process.stderr.on('data', (data) => {
      opts.onErr?.(String(data));
    });

    process.on('close', (code) => {
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
