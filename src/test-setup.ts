// Vitest global test setup
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const wt = require('node:worker_threads');
  if (wt && typeof wt.markAsUncloneable !== 'function') {
    wt.markAsUncloneable = (v: unknown) => v;
  }
} catch {
  // Ignore
}
