// WhatsApp Lead Notification Helper
// Number should be in format: 5511999999999 (country code + area code + number)
const OWNER_WHATSAPP = '5511999999999'; // TODO: Replace with your actual WhatsApp number

interface LeadData {
  storeName: string;
  ownerName?: string;
  email: string;
  segment?: string;
}

export function sendLeadNotification(data: LeadData) {
  const message = `Olá Igor! Novo lojista cadastrado:
- Loja: ${data.storeName}
- Dono: ${data.ownerName || 'Não informado'}
- E-mail: ${data.email}
- Segmento: ${data.segment || 'Hamburgueria'}`;

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${OWNER_WHATSAPP}?text=${encodedMessage}`;
  
  // Open WhatsApp in a new tab
  window.open(whatsappUrl, '_blank');
}
