import '@testing-library/jest-dom';

// JSDOM missing pieces or polyfills can be added here if needed.
// For example, matchMedia mock if components rely on it:
if (!('matchMedia' in window)) {
  // @ts-ignore
  window.matchMedia = () => ({ matches: false, addListener: () => {}, removeListener: () => {} });
}
