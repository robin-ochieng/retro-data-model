import '@testing-library/jest-dom';

// JSDOM missing pieces or polyfills can be added here if needed.
// For example, matchMedia mock if components rely on it:
if (!('matchMedia' in window)) {
  // @ts-ignore
  window.matchMedia = () => ({ matches: false, addListener: () => {}, removeListener: () => {} });
}

// Polyfill for requestSubmit used implicitly by buttons of type submit (jsdom doesn't implement it)
if (!(HTMLFormElement.prototype as any).requestSubmit) {
  (HTMLFormElement.prototype as any).requestSubmit = function () {
    // no-op: our components use buttons with type="button", this prevents jsdom from throwing
  };
}
