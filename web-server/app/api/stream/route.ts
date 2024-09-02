
import { NextRequest } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  let responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();
  let count = 0;
  let timeoutId: NodeJS.Timeout | null = null;
  let streamClosed = false;

  const closeStream = () => {
    if (!streamClosed) {
      streamClosed = true;
      writer.close().catch((error) => {
        console.error('Error closing writer:', error);
      });
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    }
  };

  function repeat() {
    if (streamClosed) return;

    console.log(count);
    count += 1;

    if (count > 10) {
      console.log('Complete timeout');
      closeStream();
    } else {
      timeoutId = setTimeout(repeat, 3000); // Recursively call repeat after 3000ms
    }
  }

  // Start the first iteration
  timeoutId = setTimeout(repeat, 3000);

  // Close the stream if the client disconnects and stop the timeout
  request.signal.onabort = () => {
    console.log('Client disconnected. Closing writer.');
    closeStream();
  };

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache, no-transform'
    }
  });
}
