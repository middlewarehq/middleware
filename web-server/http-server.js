// From Grag Farrow's blog
// https://medium.com/@greg.farrow1/nextjs-https-for-a-local-dev-server-98bb441eabd7

const { loadEnvConfig } = require('@next/env');
const { default: axios } = require('axios');
const { differenceInMinutes } = require('date-fns');
const next = require('next');
const { clamp } = require('ramda');

const { writeFileSync, readFileSync, existsSync } = require('fs');
const { createServer } = require('http');
const { parse } = require('url');

loadEnvConfig('.');
process.title = 'MHQ_HTTP_SERVER';

const hostname = 'localhost';
const port = process.env.PORT || 3000;
const dev = process.env.NEXT_PUBLIC_APP_ENVIRONMENT === 'development';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const write = (key, val) => writeFileSync(`./.local.store.${key}`, val);
const read = (key) =>
  existsSync(`./.local.store.${key}`)
    ? readFileSync(`./.local.store.${key}`).toString()
    : null;

let lastErrorDate =
  (read('error-date') && new Date(read('error-date'))) || null;
const MAX_ERR_GAP = 10;
// Take max MAX_ERR_GAP mins between alerts
let gapThreshold = clamp(0, MAX_ERR_GAP, Number(read('gap-threshold') || 0));

const channel = {
  webServerAlerts: `https://hooks.slack.com/services/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`,
  botTest: `https://hooks.slack.com/services/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`
};

app
  .prepare()
  .then(() => {
    createServer((req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
      } catch (e) {
        handleErrors(e);
      }
    }).listen(port, (err) => {
      if (err) throw err;
      console.info(`> Server started on http://localhost:${port}`);
    });
  })
  .catch(async (e) => {
    handleErrors(e, true);
  });

const handleErrors = async (e, doThrow) => {
  const err = e?.message || e?.response?.data?.message || e;
  console.error('[ERROR] Server unhandled err:', err);

  const newErrorDate = new Date();
  const gap = lastErrorDate
    ? Math.abs(differenceInMinutes(new Date(lastErrorDate), newErrorDate))
    : 0;

  console.warn(
    `Time since last error: ${gap}m`,
    `Next error alert after: ${Math.max(gapThreshold - gap, 0)}m`
  );

  if (!lastErrorDate) write('error-date', newErrorDate.toISOString());

  if (gap > gapThreshold) {
    write('error-date', newErrorDate.toISOString());
    write('gap-threshold', String(gap >= 60 ? 0 : gap + gapThreshold));
    await axios
      .post(
        process.env.NEXT_PUBLIC_APP_ENVIRONMENT === 'development'
          ? channel.botTest
          : channel.webServerAlerts,
        {
          text: `*Server boot failed* :warning:\n> *Env:* \`${process.env.NEXT_PUBLIC_APP_ENVIRONMENT}\`\n> *Error:* \`\`\`${err}\`\`\``
        }
      )
      .catch(console.error);
  }

  if (doThrow) throw e;
};
