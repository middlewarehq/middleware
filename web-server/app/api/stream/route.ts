export function GET(req: Request) {
  const encoder = new TextEncoder();
  let count = 1;
  return new Response(
    new ReadableStream({
      start(controller) {
        var interval = setInterval(() => {
          console.log('doing something  new1', Date.now());
          controller.enqueue(encoder.encode(String(Date.now() + '\n' + count)));
          count++;

          if (count > 10) {
            clearInterval(interval);
            controller.close();
          }
        }, 1000);

        req.signal.onabort = () => {
          console.log('request closed');
          clearInterval(interval);
          controller.close();
        };
        req.signal.addEventListener('abort', async () => {
          console.log('abort');
          clearInterval(interval);
          controller.close();
          // req.close();
          // await writer.close();
        });
      }
    }),
    {
      headers: {
        'content-type': 'text/plain'
      }
    }
  );
}
