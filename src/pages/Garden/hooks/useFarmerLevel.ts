import { useEffect, useState } from 'react';
import { supabase } from '@/supabase';
import { getFarmerLevel, getXpToNextLevel } from '../helpers';

export function useFarmerLevel(userId: string | undefined) {
  const [xp, setXp] = useState<number>(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    // Fast local cache first (same key GamifiedDashboard writes to)
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

    return () => { cancelled = true; };
  }, [userId]);

  const level = getFarmerLevel(xp);
  const progress = getXpToNextLevel(xp);

  return { xp, level, progress };
}
