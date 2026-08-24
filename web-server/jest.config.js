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
    //
    // CLUSTOX: `tsconfig.json` sets `jsx: "preserve"` -- correct for Next,
    // which does its own JSX transform, but it makes ts-jest emit raw `<div>`
    // into CommonJS and every test that touches a component dies on
    // `SyntaxError: Unexpected token '<'`. `testMatch` has always listed
    // `*.test.tsx`; until now nothing could actually run under it. Overriding
    // only `jsx` here leaves .ts suites (all the existing ones) untouched --
    // the option has no effect on a file with no JSX in it.
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
    // CLUSTOX: a handful of modules import as `src/contexts/...` rather than
    // `@/contexts/...`. Next resolves that through tsconfig's `baseUrl: "."`;
    // jest's `moduleDirectories: ['node_modules', 'src']` does not, because it
    // strips no prefix -- it looks for `src/src/contexts`.
    '^src/(.*)$': '<rootDir>/src/$1',
    // Same reason as the faker mapping below: jsdom's testEnvironment makes
    // Jest's resolver prefer this package's ESM build (import-only syntax),
    // which then fails to parse since node_modules isn't transformed.
    // Forcing the CJS entry (resolved by plain Node here, in the config
    // file itself, so it correctly follows the "require" export condition)
    // sidesteps that. First hit via FlexBox -> Shared.tsx -> date.ts ->
    // mock.ts -> @faker-js/faker, none of which any test imported before.
    '^uuid$': require.resolve('uuid'),
    // CLUSTOX: faker's `exports` map resolves to `dist/esm` under the jsdom
    // environment (its `node` condition is the only one pointing at CJS), and
    // that ESM entry kills any suite that reaches it -- `Cannot use import
    // statement outside a module`. It is reached constantly and invisibly:
    // `@/utils/date` imports `@/utils/mock`, which imports faker, and
    // `FlexBox` imports `date`. So *every* component in this codebase was
    // untestable for this one reason. Two util modules on this branch
    // (`benchmarks.ts`, `benchmarkBand.ts`) were deliberately written
    // import-free to dodge it. Pointing at the CJS build it already ships
    // fixes the cause instead.
    // `require.resolve` from this CJS config selects faker's `require`
    // condition, which is the CJS build -- the whole point of the entry --
    // without hardcoding a dist path that a faker major would move and that
    // would fail at config load with a bare "Cannot find module".
    '^@faker-js/faker$': require.resolve('@faker-js/faker')
  },
  moduleDirectories: ['node_modules', 'src']
};
