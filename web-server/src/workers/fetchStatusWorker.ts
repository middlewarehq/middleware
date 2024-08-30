addEventListener('message', (_event: MessageEvent<string>) => {
  // console.log('Worker ");
  setInterval(() => {
    postMessage('fetch');
  }, 3000);
});
