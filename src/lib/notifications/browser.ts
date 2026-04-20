"use client";

/** Returns the current Notification permission, normalizing unsupported to "denied". */
export function notificationPermission(): NotificationPermission {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "denied";
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export function notify(
  title: string,
  options?: NotificationOptions,
): Notification | null {
  if (typeof Notification === "undefined") return null;
  if (Notification.permission !== "granted") return null;
  try {
    return new Notification(title, {
      icon: "/icons/icon-192.svg",
      badge: "/icons/icon-192.svg",
      ...options,
    });
  } catch {
    return null;
  }
}
