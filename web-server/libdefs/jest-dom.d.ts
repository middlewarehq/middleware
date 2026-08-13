// Side-effect-only import so TS picks up @testing-library/jest-dom's global
// `expect(...).toBeInTheDocument()`-style matcher types everywhere in the
// program. jest.setup.after-env.js requires the same package at runtime;
// that require alone doesn't reach ts-jest's type-checking since it's a
// plain .js file, not part of the TS module graph.
import '@testing-library/jest-dom';
