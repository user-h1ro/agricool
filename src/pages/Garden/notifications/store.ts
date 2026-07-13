import { GardenNotification, GardenSnapshot } from './types';

const MAX_NOTIFICATIONS = 30;

function notifKey(userId: string) { return `agricool_garden_notifications_${userId}`; }
function snapshotKey(userId: string) { return `agricool_garden_notif_snapshot_${userId}`; }

export function loadNotifications(userId: string): GardenNotification[] {
  try {
    const raw = localStorage.getItem(notifKey(userId));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveNotifications(userId: string, list: GardenNotification[]) {
  try { localStorage.setItem(notifKey(userId), JSON.stringify(list.slice(0, MAX_NOTIFICATIONS))); } catch { /* ignore */ }
}

// Prepends new notifications (newest first) and persists. Returns the
// updated list so callers can update React state in one shot.
export function appendNotifications(userId: string, incoming: GardenNotification[]): GardenNotification[] {
  if (incoming.length === 0) return loadNotifications(userId);
  const existing = loadNotifications(userId);

  // Defensive de-dup: don't raise a notification that says the exact same
  // thing as one the player hasn't read yet. diffSnapshots() is already
  // written to only fire on a real state transition, so this shouldn't
  // normally trigger — it's a safety net against re-raising the same alert
  // (e.g. a future caller re-diffing after a partial state update), not a
  // replacement for that transition logic.
  const isDuplicate = (n: GardenNotification) => existing.some(e => !e.read && e.type === n.type && e.message === n.message);
  const deduped = incoming.filter(n => !isDuplicate(n));
  if (deduped.length === 0) return existing;

  const merged = [...deduped, ...existing].slice(0, MAX_NOTIFICATIONS);
  saveNotifications(userId, merged);
  return merged;
}

export function markNotificationRead(userId: string, id: string): GardenNotification[] {
  const updated = loadNotifications(userId).map(n => (n.id === id ? { ...n, read: true } : n));
  saveNotifications(userId, updated);
  return updated;
}

export function markAllNotificationsRead(userId: string): GardenNotification[] {
  const updated = loadNotifications(userId).map(n => ({ ...n, read: true }));
  saveNotifications(userId, updated);
  return updated;
}

export function loadSnapshot(userId: string): GardenSnapshot | null {
  try {
    const raw = localStorage.getItem(snapshotKey(userId));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

export function saveSnapshot(userId: string, snapshot: GardenSnapshot) {
  try { localStorage.setItem(snapshotKey(userId), JSON.stringify(snapshot)); } catch { /* ignore */ }
}