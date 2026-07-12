import { useEffect, useState } from 'react';
import { supabase } from '@/supabase';
import { getFarmerLevel, getXpToNextLevel } from '../helpers';
import { AwardXPResult, XP_EVENT_NAME } from '@/utilities/xpSystem';

export function useFarmerLevel(userId: string | undefined) {
  const [xp, setXp] = useState<number>(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    // Fast local cache first (same key xpSystem.ts writes to)
    try {
      const cached = parseInt(localStorage.getItem(`agricool_xp_${userId}`) ?? '0', 10);
      if (!Number.isNaN(cached)) setXp(cached);
    } catch { /* ignore */ }

    supabase
      .from('farmer_progress')
      .select('xp')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setXp(data?.xp ?? 0);
      });

    // Phase 3.5, item 2 — react the instant awardXP() fires anywhere in the
    // app, instead of only on mount. This is what makes the HUD bar move
    // immediately after watering/harvesting/etc. with no refresh.
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<AwardXPResult>).detail;
      if (detail) setXp(detail.newXp);
    };
    window.addEventListener(XP_EVENT_NAME, handler);

    return () => { cancelled = true; window.removeEventListener(XP_EVENT_NAME, handler); };
  }, [userId]);

  const level = getFarmerLevel(xp);
  const progress = getXpToNextLevel(xp);

  return { xp, level, progress };
}
