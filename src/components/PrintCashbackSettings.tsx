import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Printer, Wallet, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { printOrderReceipt } from '@/lib/printReceipt';

interface Props {
  storeId: string;
  storeName: string;
}

interface Settings {
  auto_print: boolean;
  cashback_enabled: boolean;
  cashback_percentage: string;
  cashback_validity_days: string;
}

export function PrintCashbackSettings({ storeId, storeName }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [s, setS] = useState<Settings>({
    auto_print: false,
    cashback_enabled: false,
    cashback_percentage: '5',
    cashback_validity_days: '30',
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('stores')
        .select('auto_print, cashback_enabled, cashback_percentage, cashback_validity_days')
        .eq('id', storeId)
        .maybeSingle();
      if (data) {
        setS({
          auto_print: !!data.auto_print,
          cashback_enabled: !!data.cashback_enabled,
          cashback_percentage: String(data.cashback_percentage ?? 5),
          cashback_validity_days: String(data.cashback_validity_days ?? 30),
        });
      }
      setLoading(false);
    })();
  }, [storeId]);

  async function save() {
    setSaving(true);
    const pct = Math.max(0, Math.min(100, parseFloat(s.cashback_percentage.replace(',', '.')) || 0));
    const days = Math.max(0, parseInt(s.cashback_validity_days, 10) || 0);
    const { error } = await supabase
      .from('stores')
      .update({
        auto_print: s.auto_print,
        cashback_enabled: s.cashback_enabled,
        cashback_percentage: pct,
        cashback_validity_days: days,
      })
      .eq('id', storeId);
    setSaving(false);
    if (error) toast.error('Erro ao salvar');
    else toast.success('Configurações salvas!');
  }

  function testPrint() {
    printOrderReceipt({
      id: 'test-' + crypto.randomUUID(),
      customer_name: 'Cliente Teste',
      customer_phone: '(11) 99999-9999',
      address: 'Rua Exemplo, 123 - Centro',
      payment_method: 'whatsapp_pix',
      items: [
        { name: 'Produto Teste', quantity: 2, price: 15.9 },
        { name: 'Bebida Grande', quantity: 1, price: 8, modifiers: [{ name: 'Sem gelo', price: 0 }] },
      ],
      total: 39.8,
      created_at: new Date().toISOString(),
      store_name: storeName,
    });
  }

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="py-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Printer className="w-4 h-4 text-primary" />
          Impressão & Cashback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Print */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
          <div>
            <Label className="text-sm">Imprimir pedidos automaticamente</Label>
            <p className="text-xs text-muted-foreground">
              Ao receber um pedido, abre a janela de impressão (impressora térmica 80mm).
            </p>
          </div>
          <Switch
            checked={s.auto_print}
            onCheckedChange={(v) => setS({ ...s, auto_print: v })}
          />
        </div>
        <Button variant="outline" size="sm" onClick={testPrint} className="gap-2">
          <Printer className="w-4 h-4" /> Testar impressão
        </Button>

        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-primary" />
            <Label className="text-sm font-medium">Cashback para clientes</Label>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 mb-3">
            <div>
              <Label className="text-sm">Ativar cashback</Label>
              <p className="text-xs text-muted-foreground">
                O cliente ganha crédito em cada compra e pode usar no próximo pedido.
              </p>
            </div>
            <Switch
              checked={s.cashback_enabled}
              onCheckedChange={(v) => setS({ ...s, cashback_enabled: v })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Percentual (%)</Label>
              <Input
                inputMode="decimal"
                value={s.cashback_percentage}
                onChange={(e) => setS({ ...s, cashback_percentage: e.target.value })}
                placeholder="5"
                disabled={!s.cashback_enabled}
              />
            </div>
            <div>
              <Label className="text-xs">Validade (dias)</Label>
              <Input
                inputMode="numeric"
                value={s.cashback_validity_days}
                onChange={(e) => setS({ ...s, cashback_validity_days: e.target.value })}
                placeholder="30"
                disabled={!s.cashback_enabled}
              />
            </div>
          </div>
        </div>

        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Salvar configurações
        </Button>
      </CardContent>
    </Card>
  );
}
