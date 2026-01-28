import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GlobalSettings {
  owner_whatsapp: string;
  subscription_price: number;
  default_trial_days: number;
}

const DEFAULT_SETTINGS: GlobalSettings = {
  owner_whatsapp: '5511999999999',
  subscription_price: 97,
  default_trial_days: 7,
};

export function useGlobalSettings() {
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .select('key, value');

      if (error) throw error;

      const newSettings: GlobalSettings = { ...DEFAULT_SETTINGS };

      data?.forEach((item) => {
        switch (item.key) {
          case 'owner_whatsapp':
            newSettings.owner_whatsapp = item.value;
            break;
          case 'subscription_price':
            newSettings.subscription_price = parseFloat(item.value) || 97;
            break;
          case 'default_trial_days':
            newSettings.default_trial_days = parseInt(item.value, 10) || 7;
            break;
        }
      });

      setSettings(newSettings);
    } catch (err) {
      console.error('Error fetching global settings:', err);
    } finally {
      setLoading(false);
    }
  }

  return { settings, loading, refetch: fetchSettings };
}

// Standalone function to get owner WhatsApp (for use in non-React contexts)
export async function getOwnerWhatsApp(): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('get_global_setting', {
      setting_key: 'owner_whatsapp',
    });

    if (error) throw error;
    return data || '5511999999999';
  } catch {
    return '5511999999999';
  }
}
