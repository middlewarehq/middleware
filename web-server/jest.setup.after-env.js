// Runs after the test framework (expect, jest globals) is installed --
// unlike jest.setup.js's setupFiles hook, jest-dom's matchers need `expect`
// to already exist to extend it.
require('@testing-library/jest-dom');
