module.exports = {
  preset: 'ts-jest/presets/js-with-babel', // Use the TypeScript preset with Babel
  testEnvironment: 'jsdom', // Use jsdom as the test environment (for browser-like behavior)
  setupFiles: ['<rootDir>/jest.setup.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.after-env.js'],
  // tsconfig.json's baseUrl:"." is what makes a bare `from 'src/components/X'`
  // import (no @/ alias, no relative path) resolve in the real app -- Jest
  // doesn't read tsconfig's baseUrl on its own, so without this it can't
  // find any module imported that way. First hit via
  // pages/integrations.tsx importing 'src/components/Authenticated'.
  modulePaths: ['<rootDir>'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: [
    '**/__tests__/**/*.test.(ts|tsx|js|jsx)',
    '**/*.test.ts',
    '**/*.test.tsx'
  ],
  transform: {
    // tsconfig.json sets jsx:"preserve" so Next's own SWC build handles
    // JSX -- ts-jest respects that setting too, which means it never
    // lowers JSX to React.createElement()/jsx() calls, leaving raw JSX in
    // its output for Node to choke on. Override just for the test
    // transform, without touching the real tsconfig.
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }]
  },
  testPathIgnorePatterns: ['/node_modules/', 'auth.spec.ts'],
  moduleNameMapper: {
    // Checked in order -- first match wins. This must come before the
    // '^@/(.*)$' alias rule below: @/mocks/icons/gitlab.svg matches both,
    // and the alias rule matching first would just resolve it to another
    // raw, still-unparseable .svg file, never reaching this one. Next's
    // build treats .svg imports as React components via an SVGR-style
    // loader; Jest has no such transform and chokes trying to parse raw
    // SVG/XML as JS. First hit via JiraIntegrationCard ->
    // githubIntegration.tsx -> gitlab.svg / jira-icon.svg.
    '\\.svg$': '<rootDir>/src/mocks/__mocks__/svg.js',
    '^@/public/(.*)$': '<rootDir>/public/$1',
    '^@/api/(.*)$': '<rootDir>/pages/api/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^uuid$': require.resolve('uuid'),
    // Same reason as the uuid mapping above: jsdom's testEnvironment makes
    // Jest's resolver prefer this package's ESM build (import-only syntax),
    // which then fails to parse since node_modules isn't transformed.
    // Forcing the CJS entry (resolved by plain Node here, in the config
    // file itself, so it correctly follows the "require" export condition)
    // sidesteps that. First hit via FlexBox -> Shared.tsx -> date.ts ->
    // mock.ts -> @faker-js/faker, none of which any test imported before.
    '^@faker-js/faker$': require.resolve('@faker-js/faker')
  },
  moduleDirectories: ['node_modules', 'src']
};
