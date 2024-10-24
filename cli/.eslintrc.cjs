module.exports = {
  env: {
    browser: false,
    es2021: true,
    node: true
  },
  extends: ['plugin:react/recommended', 'plugin:react/jsx-runtime'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: [
    'prettier',
    'react',
    '@typescript-eslint',
    'unused-imports',
    'import',
    'react-hooks'
  ],
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    quotes: [
      'warn',
      'single',
      { avoidEscape: true, allowTemplateLiterals: true }
    ],
    'no-unsafe-optional-chaining': [
      'error',
      { disallowArithmeticOperators: true }
    ],
    'react/jsx-filename-extension': [
      'error',
      { extensions: ['.js', '.jsx', '.ts', '.tsx'] }
    ],
    'prettier/prettier': 'warn',
    'react/prop-types': 'off',
    'react/display-name': 'off',
    'react/no-unescaped-entities': 'off',
    'react/jsx-max-props-per-line': [
      1,
      {
        maximum: 2,
        when: 'multiline'
      }
    ],
    '@typescript-eslint/no-unused-vars': 'off',
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'warn',
      {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_'
      }
    ],
    'import/order': [
      'error',
      {
        pathGroups: [
          {
            pattern: '@/**',
            group: 'internal',
            position: 'after'
          }
        ],
        distinctGroup: false,
        groups: [
          'external',
          'builtin',
          'internal',
          'index',
          'sibling',
          'parent',
          'object',
          'type'
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true
        }
      }
    ],
    'react/jsx-no-target-blank': 'off',
    'react/require-render-return': 'off',
    'react/no-direct-mutation-state': 'off',
    'react-hooks/exhaustive-deps': 'warn'
  }
};
