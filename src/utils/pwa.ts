/**
 * PWA Installation Helper
 * Captures `beforeinstallprompt` on Chromium browsers (Chrome, Edge, Brave, Android),
 * provides reactive listener subscriptions, and triggers native install prompts.
 */

let deferredPrompt: any = null;
const installListeners = new Set<(canInstall: boolean) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chromium 67 and earlier from automatically showing the prompt
    e.preventDefault();
    deferredPrompt = e;
    installListeners.forEach(listener => listener(true));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installListeners.forEach(listener => listener(false));
  });
}

/**
 * Subscribes a React component or listener to PWA installability changes.
 */
export function subscribePwaInstall(callback: (canInstall: boolean) => void): () => void {
  installListeners.add(callback);
  callback(deferredPrompt !== null);
  return () => {
    installListeners.delete(callback);
  };
}

/**
 * Returns whether a native install prompt is currently queued.
 */
export function isPwaInstallable(): boolean {
  return deferredPrompt !== null;
}

/**
 * Prompts the user with the native Chromium installation dialog.
 */
export async function promptPwaInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    return false;
  }

  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    installListeners.forEach(listener => listener(false));
    return outcome === 'accepted';
  } catch {
    deferredPrompt = null;
    installListeners.forEach(listener => listener(false));
    return false;
  }
}

