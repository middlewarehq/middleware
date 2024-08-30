"use strict";
addEventListener('message', (_event) => {
    // console.log('Worker ");
    setInterval(() => {
        postMessage('fetch');
    }, 2000);
});
//# sourceMappingURL=fetchLogsWorker.js.map