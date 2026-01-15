import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

type OrderStatus = 'pending' | 'preparing' | 'out_for_delivery' | 'completed';

interface WhatsAppNotifyButtonProps {
  orderId: string;
  customerName: string;
  customerPhone: string | null;
  status: string | null;
  storeName: string;
}

const STATUS_MESSAGES: Record<OrderStatus, (name: string, orderId: string, storeName: string) => string> = {
  pending: (name, orderId, storeName) =>
    `Olá ${name}! 👋 Seu pedido #${orderId.slice(0, 8).toUpperCase()} da ${storeName} foi recebido e está aguardando confirmação! 📝`,
  preparing: (name, orderId, storeName) =>
    `Olá ${name}! 🔥 Seu pedido #${orderId.slice(0, 8).toUpperCase()} da ${storeName} está sendo preparado com carinho! Já já sai! 👨‍🍳`,
  out_for_delivery: (name, orderId, storeName) =>
    `Boa notícia, ${name}! 🛵 Seu pedido #${orderId.slice(0, 8).toUpperCase()} da ${storeName} saiu para entrega! O entregador chegará em breve! 📦`,
  completed: (name, orderId, storeName) =>
    `Olá ${name}! ✅ Seu pedido #${orderId.slice(0, 8).toUpperCase()} da ${storeName} foi concluído! Esperamos que aproveite! 😋🎉`,
};

export function WhatsAppNotifyButton({
  orderId,
  customerName,
  customerPhone,
  status,
  storeName,
}: WhatsAppNotifyButtonProps) {
  const handleNotify = () => {
    if (!customerPhone) {
      toast.error('Cliente não tem telefone cadastrado');
      return;
    }

    const orderStatus = (status || 'pending') as OrderStatus;
    const messageGenerator = STATUS_MESSAGES[orderStatus];
    
    if (!messageGenerator) {
      toast.error('Status inválido para notificação');
      return;
    }

    const firstName = customerName.split(' ')[0];
    const message = messageGenerator(firstName, orderId, storeName);
    const phoneNumber = customerPhone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
    toast.success('Abrindo WhatsApp...');
  };

  if (!customerPhone) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleNotify}
      className="gap-2 bg-green-500/10 border-green-500/30 text-green-500 hover:bg-green-500/20 hover:text-green-400"
    >
      <MessageCircle className="w-4 h-4" />
      Notificar
    </Button>
  );
}
