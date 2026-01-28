// WhatsApp Lead Notification Helper
import { getOwnerWhatsApp } from '@/hooks/useGlobalSettings';

interface LeadData {
  storeName: string;
  ownerName?: string;
  email: string;
  segment?: string;
}

export async function sendLeadNotification(data: LeadData) {
  // Fetch the owner WhatsApp from global settings
  const ownerWhatsApp = await getOwnerWhatsApp();
  
  const message = `Olá Igor! Novo lojista cadastrado:
- Loja: ${data.storeName}
- Dono: ${data.ownerName || 'Não informado'}
- E-mail: ${data.email}
- Segmento: ${data.segment || 'Hamburgueria'}`;

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${ownerWhatsApp}?text=${encodedMessage}`;
  
  // Open WhatsApp in a new tab
  window.open(whatsappUrl, '_blank');
}
