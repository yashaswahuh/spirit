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

export function getTaskNotificationId(taskId: string): number {
  let hash = 0;
  for (let i = 0; i < taskId.length; i++) {
    hash = (hash << 5) - hash + taskId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 2147483647);
}

export async function scheduleTaskReminder(task: {
  id: string;
  title: string;
  type: string;
  due_at: string | null;
  venue?: string | null;
  reminder_offset?: number | null;
  course_name?: string;
}): Promise<boolean> {
  if (!task.due_at || !task.reminder_offset || task.reminder_offset <= 0) {
    return false;
  }

  const dueTime = new Date(task.due_at).getTime();
  const triggerTime = new Date(dueTime - task.reminder_offset * 60000);

  if (triggerTime.getTime() <= Date.now()) {
    return false;
  }

  const notifId = getTaskNotificationId(task.id);
  const coursePrefix = task.course_name ? `[${task.course_name}] ` : '';
  const typeLabel = task.type.replace('_', ' ').toUpperCase();
  const title = `Reminder: ${coursePrefix}${task.title}`;
  const body = `${typeLabel} is due soon${task.venue ? ` at ${task.venue}` : ''}.`;

  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== 'granted') return false;
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title,
            body,
            schedule: { at: triggerTime },
            extra: { taskId: task.id },
          },
        ],
      });
      return true;
    } catch (err) {
      console.warn('Failed to schedule native reminder:', err);
      return false;
    }
  }

  return false;
}

export async function cancelTaskReminder(taskId: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const notifId = getTaskNotificationId(taskId);
      await LocalNotifications.cancel({
        notifications: [{ id: notifId }],
      });
    } catch (err) {
      console.warn('Failed to cancel native reminder:', err);
    }
  }
}
