self.addEventListener('message', async (event) => {
  const { apiUrl, interval } = event.data;
  if (!apiUrl || !interval) {
    self.postMessage({ error: 'apiUrl and interval are required' });
    return;
  }
  const fetchData = async () => {
    try {
      const response = await fetch(apiUrl);

      const data = await response.json();
      self.postMessage({ data });
    } catch (error) {
      self.postMessage({ error: error.message });
    }
  };

  // Fetch data immediately
  await fetchData();

  // Set interval to fetch data periodically
  const intervalId = setInterval(fetchData, interval);

  // Listen for stop message to clear the interval
  self.addEventListener('message', (e) => {
    if (e.data === 'stop') {
      clearInterval(intervalId);
    }
  });
});
