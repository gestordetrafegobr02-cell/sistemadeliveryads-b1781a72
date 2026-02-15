import { AlertTriangle, MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGlobalSettings } from '@/hooks/useGlobalSettings';

interface TrialExpiredBannerProps {
  storeName: string;
}

export function TrialExpiredBanner({ storeName }: TrialExpiredBannerProps) {
  const { settings, loading } = useGlobalSettings();

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      `Olá! Sou proprietário da loja "${storeName}" e gostaria de renovar minha assinatura.`
    );
    window.open(`https://wa.me/${settings.owner_whatsapp}?text=${message}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
          className="gap-2 bg-primary hover:bg-primary/90"
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
