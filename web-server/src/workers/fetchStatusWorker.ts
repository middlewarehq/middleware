addEventListener('message', (_event: MessageEvent<string>) => {
  setInterval(() => {
    postMessage('fetch');
  }, 3000);
});
