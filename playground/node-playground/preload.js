// Define __PACKAGE_VERSION__ for packages that rely on esbuild's `define` at
// build time. When running source directly via ts-node, esbuild never runs,
// so we set the global here instead.
globalThis.__PACKAGE_VERSION__ = 'dev';
