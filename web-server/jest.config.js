module.exports = {
  preset: 'ts-jest/presets/js-with-babel', // Use the TypeScript preset with Babel
  testEnvironment: 'jsdom', // Use jsdom as the test environment (for browser-like behavior)
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: [
    '**/__tests__/**/*.test.(ts|tsx|js|jsx)',
    '**/*.test.ts',
    '**/*.test.tsx'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest' // Transform TypeScript files using ts-jest
  },
  testPathIgnorePatterns: ['/node_modules/', 'auth.spec.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1', // Example alias for modules under 'src'
    '^uuid$': require.resolve('uuid')
  },
  moduleDirectories: ['node_modules', 'src']
};
