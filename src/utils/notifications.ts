/**
 * Browser Notification Utility
 * Honestly scoped for local-only apps:
 * Since there is no server for Web Push, notifications work only
 * while the app/tab or installed PWA is open and active in memory.
 */

export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Failed to request notification permission:', err);
    return Notification.permission;
  }
};

export const sendBrowserNotification = (
  title: string,
  options?: NotificationOptions
): boolean => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const icon = '/pwa-192x192.png';
    const notif = new Notification(title, {
      icon,
      badge: icon,
      ...options,
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };

    return true;
  } catch (err) {
    console.error('Error dispatching browser notification:', err);
    return false;
  }
};

export const sendTestNotification = async (): Promise<boolean> => {
  if (!isNotificationSupported()) return false;

  let permission: NotificationPermission | 'unsupported' = Notification.permission;
  if (permission === 'default') {
    permission = await requestNotificationPermission();
  }

  if (permission === 'granted') {
    return sendBrowserNotification('Spirit Notifications Active', {
      body: 'Browser notifications are working while Spirit is open or active.',
      tag: 'spirit-test-alert',
    });
  }

  return false;
};
