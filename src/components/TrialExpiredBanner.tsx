import { AlertTriangle, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TrialExpiredBannerProps {
  storeName: string;
  whatsappNumber?: string;
}

export function TrialExpiredBanner({ storeName, whatsappNumber = '5511999999999' }: TrialExpiredBannerProps) {
  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      `Olá! Sou proprietário da loja "${storeName}" e gostaria de renovar minha assinatura.`
    );
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="font-display text-3xl text-foreground">Período de Teste Encerrado</h1>
          <p className="text-muted-foreground">
            O período de teste desta loja expirou. Para continuar aceitando pedidos, entre em contato conosco para ativar sua assinatura.
          </p>
        </div>

        <Button
          size="lg"
          onClick={handleWhatsApp}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
        >
          <MessageCircle className="w-5 h-5" />
          Falar no WhatsApp
        </Button>

        <p className="text-xs text-muted-foreground">
          Sua loja será reativada imediatamente após a confirmação do pagamento.
        </p>
      </div>
    </div>
  );
}
