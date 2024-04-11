import faker from '@faker-js/faker';
import { GitHub } from '@mui/icons-material';

const bgOpacity = 0.6;

export const integrationsDisplay = {
  id: faker.datatype.uuid(),
  type: 'github',
  name: 'Github',
  description: 'Code insights & blockers',
  color: '#fff',
  bg: `linear-gradient(135deg, hsla(160, 10%, 61%, ${bgOpacity}) 0%, hsla(247, 0%, 21%, ${bgOpacity}) 100%)`,
  icon: <GitHub fontSize="large" />
};

export type IntegrationItem = typeof integrationsDisplay;
