import { useEffect, useState } from 'react';
import { supabase } from '@/supabase';

interface ProfileInfo {
  username: string;
  avatarUrl: string | null;
}

export function useProfile(userId: string | undefined, fallbackEmail?: string | null) {
  const [profile, setProfile] = useState<ProfileInfo>({
    username: fallbackEmail?.split('@')[0] ?? 'Farmer',
    avatarUrl: null,
  });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setProfile({
          username: data.username || fallbackEmail?.split('@')[0] || 'Farmer',
          avatarUrl: data.avatar_url ?? null,
        });
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return profile;
}
