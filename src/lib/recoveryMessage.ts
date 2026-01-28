/**
 * Formats a recovery message template with actual customer data
 * @param template The message template with {cliente}, {loja}, {pedido} placeholders
 * @param customerName The customer's name
 * @param storeName The store's name
 * @param items Array of cart items with name and quantity
 * @returns Formatted message string
 */
export function formatRecoveryMessage(
  template: string,
  customerName: string,
  storeName: string,
  items: Array<{ name: string; quantity: number }>
): string {
  const itemsList = items
    .map((item) => `${item.quantity}x ${item.name}`)
    .join(', ');

  return template
    .replace(/{cliente}/gi, customerName)
    .replace(/{loja}/gi, storeName)
    .replace(/{pedido}/gi, itemsList || 'seu pedido');
}

/**
 * Creates a WhatsApp URL with the formatted recovery message
 * @param phone Customer phone number (with country code)
 * @param message The formatted message
 * @returns WhatsApp web URL
 */
export function createRecoveryWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Default recovery message template
 */
export const DEFAULT_RECOVERY_TEMPLATE = 
  'Olá {cliente}, notamos que você deixou um {pedido} no carrinho na {loja}. Quer finalizar seu pedido agora?';
