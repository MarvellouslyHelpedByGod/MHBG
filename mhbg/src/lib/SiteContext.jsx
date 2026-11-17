import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from './supabase.js';

const SiteContext = createContext(null);

export function SiteProvider({ children }) {
  const [settings, setSettings] = useState({});
  // undefined = still loading, null = no active conference
  const [conference, setConference] = useState(undefined);

  const reload = useCallback(async () => {
    if (!supabaseConfigured) {
      setConference(null);
      return;
    }
    const [s, c] = await Promise.all([
      supabase.from('site_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('conferences').select('*').eq('is_active', true).maybeSingle(),
    ]);
    setSettings(s.data || {});
    setConference(c.data || null);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <SiteContext.Provider value={{ settings, conference, reload }}>{children}</SiteContext.Provider>
  );
}

export const useSite = () => useContext(SiteContext);
