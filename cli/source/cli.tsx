#!/usr/bin/env node
import { render } from 'ink';
import meow from 'meow';

import { App } from './app.js';

meow(
  `
  Usage
    $ cli

  Options
    --name  Your name

  Examples
    $ cli --name=Jane
    Hello, Jane
`,
  {
    importMeta: import.meta,
    flags: {
      name: {
        type: 'string'
      }
    }
  }
);

render(<App />, { exitOnCtrlC: false });
