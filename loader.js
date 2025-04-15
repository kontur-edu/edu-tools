export function resolve(specifier, context, nextResolve) {
  if (!specifier.endsWith('.js') && !specifier.endsWith('.mjs') && specifier.startsWith('.')) {
    specifier += '.js';
  }
  return nextResolve(specifier);
}
