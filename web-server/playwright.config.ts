import type { PlaywrightTestConfig } from '@playwright/test';

require('dotenv').config({ path: '.env.local' });

const config: PlaywrightTestConfig = {
  reporter: [['html', { open: 'never' }]]
};

export default config;
