import { Bell, BellOff, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface Props { storeId: string | null; }

export function PushNotificationToggle({ storeId }: Props) {
  const { supported, status, subscribed, enable, disable } = usePushNotifications(storeId);

  if (!supported) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/40 p-3 text-xs text-muted-foreground flex items-center gap-2">
        <BellOff className="w-4 h-4" />
        Este dispositivo não suporta notificações push.
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive flex items-center gap-2">
        <BellOff className="w-4 h-4" />
        Notificações bloqueadas. Libere nas configurações do navegador para receber alertas de pedido.
      </div>
    );
  }

  const handleEnable = async () => {
    const ok = await enable();
    if (ok) toast.success('Alertas ativados! Você receberá push a cada novo pedido, mesmo com o app fechado.');
    else toast.error('Não foi possível ativar as notificações.');
  };

  const handleDisable = async () => {
    await disable();
    toast.success('Alertas desativados neste dispositivo.');
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${subscribed ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
        {subscribed ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">
          {subscribed ? 'Alertas de pedido ativos' : 'Ative os alertas de pedido'}
        </p>
        <p className="text-xs text-muted-foreground leading-snug">
          {subscribed
            ? 'Este dispositivo recebe push (som + vibração) mesmo com o app fechado.'
            : 'Receba notificação com som e vibração no celular a cada novo pedido — funciona com o app fechado.'}
        </p>
      </div>
      {subscribed ? (
        <Button size="sm" variant="outline" onClick={handleDisable}>Desativar</Button>
      ) : (
        <Button size="sm" onClick={handleEnable}>Ativar</Button>
      )}
    </div>
  );
}
