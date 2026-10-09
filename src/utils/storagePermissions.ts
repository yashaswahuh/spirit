import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';

/**
 * Storage Permissions Utility
 * Manages checking and prompting for runtime storage permissions on Android
 * to allow saving PDF reports, backups, and calendar files.
 */

export async function checkStoragePermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return true;
  }

  try {
    const status = await Filesystem.checkPermissions();
    return status.publicStorage === 'granted';
  } catch (err) {
    console.warn('Could not check storage permissions:', err);
    return false;
  }
}

export async function requestStoragePermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return true;
  }

  try {
    const status = await Filesystem.requestPermissions();
    return status.publicStorage === 'granted';
  } catch (err) {
    console.error('Error requesting storage permissions:', err);
    return false;
  }
}

