import next from 'next';

import fs from 'fs';
import { createServer } from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'url';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(__dirname, 'DIR NAME');

const splitted = __dirname.split('/');
splitted.pop();
let newpath = splitted.join('/');

const httpsOptions = {
  key: fs.readFileSync(path.join(newpath, 'localhost-key.pem')),
  cert: fs.readFileSync(path.join(newpath, 'localhost.pem'))
};

app.prepare().then(() => {
  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(process.env.PORT || 3333, (err) => {
    if (err) throw err;
    console.log(`> Server started on https://localhost:${process.env.PORT}`);
  });
});
