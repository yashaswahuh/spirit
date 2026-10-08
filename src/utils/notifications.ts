/**
 * Application Notification Utility
 * Handles native local notifications on Android/iOS via @capacitor/local-notifications
 * and falls back to browser notifications for web/PWA.
 */

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const isNotificationSupported = (): boolean => {
  if (Capacitor.isNativePlatform()) return true;
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (Capacitor.isNativePlatform()) {
    return 'default';
  }
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

export const checkNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display === 'granted') return 'granted';
      if (perm.display === 'denied') return 'denied';
      return 'default';
    } catch (err) {
      console.warn('Failed to check native notification permission:', err);
      return 'default';
    }
  }

  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display === 'granted') return 'granted';
      if (perm.display === 'denied') return 'denied';
      return 'default';
    } catch (err) {
      console.error('Failed to request native notification permission:', err);
      return 'denied';
    }
  }

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
  if (Capacitor.isNativePlatform()) {
    LocalNotifications.schedule({
      notifications: [
        {
          title,
          body: options?.body || '',
          id: Math.floor(Math.random() * 100000) + 1,
        },
      ],
    }).catch(err => console.error('Error dispatching native notification:', err));
    return true;
  }

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
  if (Capacitor.isNativePlatform()) {
    try {
      const permStatus = await LocalNotifications.checkPermissions();
      if (permStatus.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== 'granted') return false;
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'Spirit Notifications Active',
            body: 'Native Android alerts are working! You will receive timely attendance and timetable notifications.',
            id: 101,
          },
        ],
      });
      return true;
    } catch (err) {
      console.error('Failed to send native test notification:', err);
      return false;
    }
  }

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
