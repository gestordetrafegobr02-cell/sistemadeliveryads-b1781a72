import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, CreditCard, MessageCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type CheckoutType = 'whatsapp' | 'direct_cardapio';

interface PaymentsTabProps {
  storeId: string;
}

export function PaymentsTab({ storeId }: PaymentsTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkoutType, setCheckoutType] = useState<CheckoutType>('whatsapp');
  const [publicKey, setPublicKey] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data, error } = await supabase
        .from('stores')
        // @ts-expect-error new columns not yet in generated types
        .select('checkout_type, mercadopago_public_key, mercadopago_access_token')
        .eq('id', storeId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error('[Payments] load error', error);
      } else if (data) {
        const row = data as unknown as {
          checkout_type?: string;
          mercadopago_public_key?: string | null;
          mercadopago_access_token?: string | null;
        };
        setCheckoutType((row.checkout_type as CheckoutType) || 'whatsapp');
        setPublicKey(row.mercadopago_public_key || '');
        setAccessToken(row.mercadopago_access_token || '');
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [storeId]);

  async function handleSave() {
    if (checkoutType === 'direct_cardapio') {
      if (!publicKey.trim() || !accessToken.trim()) {
        toast.error('Informe a Public Key e o Access Token do Mercado Pago.');
        return;
      }
      if (!publicKey.startsWith('APP_USR-') && !publicKey.startsWith('TEST-')) {
        toast.error('Public Key inválida (deve começar com APP_USR- ou TEST-).');
        return;
      }
    }
    setSaving(true);
    const { error } = await supabase
      .from('stores')
      // @ts-expect-error new columns
      .update({
        checkout_type: checkoutType,
        mercadopago_public_key: publicKey.trim() || null,
        mercadopago_access_token: accessToken.trim() || null,
      })
      .eq('id', storeId);
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
    } else {
      toast.success('Configurações de pagamento salvas!');
    }
  }

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="font-display text-xl flex items-center gap-2">
          <CreditCard className="w-5 h-5" /> Pagamentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="text-base">Como o cliente finaliza o pedido?</Label>
          <RadioGroup
            value={checkoutType}
            onValueChange={(v) => setCheckoutType(v as CheckoutType)}
            className="mt-3 space-y-2"
          >
            <label className="flex items-start gap-3 p-4 rounded-lg bg-secondary cursor-pointer border border-transparent has-[input:checked]:border-primary">
              <RadioGroupItem value="whatsapp" id="ck-wa" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-medium">
                  <MessageCircle className="w-4 h-4 text-green-500" />
                  Finalizar Pedido no WhatsApp
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  O pedido é enviado pelo WhatsApp e o cliente combina o pagamento com você.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-lg bg-secondary cursor-pointer border border-transparent has-[input:checked]:border-primary">
              <RadioGroupItem value="direct_cardapio" id="ck-mp" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-medium">
                  <CreditCard className="w-4 h-4 text-blue-500" />
                  Pagamento Direto no Cardápio (Mercado Pago)
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cliente paga com Pix ou Cartão direto no cardápio. A opção "Pagar na Entrega" continua disponível.
                </p>
              </div>
            </label>
          </RadioGroup>
        </div>

        {checkoutType === 'direct_cardapio' && (
          <div className="space-y-4 p-4 rounded-lg border border-border bg-secondary/50">
            <p className="text-sm text-muted-foreground">
              Cole as credenciais da sua conta Mercado Pago. Você as encontra em{' '}
              <a
                href="https://www.mercadopago.com.br/developers/panel/app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Mercado Pago → Suas integrações
              </a>.
            </p>
            <div>
              <Label>Public Key</Label>
              <Input
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder="APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="mt-1 bg-background border-border font-mono text-xs"
              />
            </div>
            <div>
              <Label>Access Token</Label>
              <div className="relative mt-1">
                <Input
                  type={showToken ? 'text' : 'password'}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="bg-background border-border font-mono text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Mostrar/Ocultar"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Armazenado de forma segura. Apenas você (dono da loja) tem acesso.
              </p>
            </div>
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-primary-foreground"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Salvar Pagamentos
        </Button>
      </CardContent>
    </Card>
  );
}
