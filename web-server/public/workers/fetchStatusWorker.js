"use strict";
addEventListener('message', (_event) => {
    // console.log('Worker ");
    setInterval(() => {
        postMessage('fetch');
    }, 3000);
});
//# sourceMappingURL=fetchStatusWorker.js.map