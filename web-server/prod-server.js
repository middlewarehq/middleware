import fs from 'fs';
import http2 from 'http2';
import path from 'path';

const options = {
  key: fs.readFileSync(
    path.join('/etc/letsencrypt/live/middleware.com/privkey.pem')
  ),
  cert: fs.readFileSync(
    path.join('/etc/letsencrypt/live/middleware.com/fullchain.pem')
  )
};

const server = http2.createSecureServer(options);
server.listen(3333, () => {
  console.log('HTTP/2 server is running on https://localhost:3333');
});

server.on('error', (err) => {
  console.error('Error starting server:', err);
});
