import { useCallback, useEffect, useState } from 'react';
import { DailyQuest, GardenLayout, PestEvent } from '../types';
import { GardenNotification } from '../notifications/types';
import {
  loadNotifications, appendNotifications, markNotificationRead, markAllNotificationsRead,
  loadSnapshot, saveSnapshot,
} from '../notifications/store';
import { buildSnapshot, diffSnapshots } from '../notifications/diff';

interface UseGardenNotificationsArgs {
  userId: string | undefined;
  layout: GardenLayout;
  activePests: PestEvent[];
  weatherLabel: string;
  dailyQuests: DailyQuest[];
  level: number;
}

export function useGardenNotifications({
  userId, layout, activePests, weatherLabel, dailyQuests, level,
}: UseGardenNotificationsArgs) {
  const [notifications, setNotifications] = useState<GardenNotification[]>([]);

  // Load whatever's already persisted as soon as we know who the user is.
  useEffect(() => {
    if (!userId) { setNotifications([]); return; }
    setNotifications(loadNotifications(userId));
  }, [userId]);

  // Watch garden state for transitions worth notifying about.
  useEffect(() => {
    if (!userId || layout.length === 0) return;
    const snapshot = buildSnapshot(layout, activePests, weatherLabel, dailyQuests, level);
    const prev = loadSnapshot(userId);
    const newOnes = diffSnapshots(prev, snapshot, layout, activePests, dailyQuests);
    if (newOnes.length > 0) {
      setNotifications(appendNotifications(userId, newOnes));
    }
    saveSnapshot(userId, snapshot);
    // Intentionally keyed on stable/serializable values only — layout and
    // activePests are new array references on every garden update, so we
    // key off their JSON to avoid re-diffing on unrelated re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, JSON.stringify(layout), JSON.stringify(activePests), weatherLabel, JSON.stringify(dailyQuests), level]);

  const markRead = useCallback((id: string) => {
    if (!userId) return;
    setNotifications(markNotificationRead(userId, id));
  }, [userId]);

  const markAllRead = useCallback(() => {
    if (!userId) return;
    setNotifications(markAllNotificationsRead(userId));
  }, [userId]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, unreadCount, markRead, markAllRead };
}
