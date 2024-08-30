addEventListener('message', (_event: MessageEvent<string>) => {
  setInterval(() => {
    postMessage('fetch');
  }, 2000);
});
