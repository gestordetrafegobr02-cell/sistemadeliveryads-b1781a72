// WhatsApp Lead Notification Helper - Automated via Edge Function
import { supabase } from '@/integrations/supabase/client';

interface LeadData {
  storeName: string;
  ownerName?: string;
  email: string;
  phone?: string;
  segment?: string;
}

export async function sendLeadNotification(data: LeadData): Promise<void> {
  try {
    console.log('[sendLeadNotification] Sending lead notification:', data);
    
    // Call the edge function to process the notification
    const { data: response, error } = await supabase.functions.invoke('notify-lead', {
      body: {
        storeName: data.storeName,
        email: data.email,
        phone: data.phone,
        segment: data.segment || 'Hamburgueria',
      }
    });

    if (error) {
      console.error('[sendLeadNotification] Edge function error:', error);
      return;
    }

    // Automatically open WhatsApp with the pre-filled message
    if (response?.whatsappUrl) {
      console.log('[sendLeadNotification] Opening WhatsApp notification...');
      window.open(response.whatsappUrl, '_blank');
    }

    console.log('[sendLeadNotification] Lead notification processed successfully');
  } catch (err) {
    console.error('[sendLeadNotification] Error sending notification:', err);
  }
}

// Silent notification that doesn't open WhatsApp (for background logging only)
export async function logLeadNotification(data: LeadData): Promise<boolean> {
  try {
    console.log('[logLeadNotification] Logging lead:', data);
    
    const { error } = await supabase.functions.invoke('notify-lead', {
      body: {
        storeName: data.storeName,
        email: data.email,
        phone: data.phone,
        segment: data.segment || 'Hamburgueria',
      }
    });

    if (error) {
      console.error('[logLeadNotification] Error logging lead:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[logLeadNotification] Error:', err);
    return false;
  }
}
