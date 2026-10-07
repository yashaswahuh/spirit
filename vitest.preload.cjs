// Polyfill node:worker_threads markAsUncloneable for environments (like Node 20 / jsdom)
// where undici >= 8.0.3 attempts to call webidl.util.markAsUncloneable.
try {
  const wt = require('node:worker_threads');
  if (wt && typeof wt.markAsUncloneable !== 'function') {
    wt.markAsUncloneable = (v) => v;
  }
} catch {
  // Ignore in environments where node:worker_threads cannot be required
}
