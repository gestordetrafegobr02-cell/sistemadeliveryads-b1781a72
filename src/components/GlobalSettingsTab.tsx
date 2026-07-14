import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Save, MessageCircle, Settings, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GlobalSettings {
  owner_whatsapp: string;
  subscription_price: string;
  default_trial_days: string;
  landing_pixel_id: string;
}

export function GlobalSettingsTab() {
  const [settings, setSettings] = useState<GlobalSettings>({
    owner_whatsapp: '',
    subscription_price: '97',
    default_trial_days: '7',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .select('key, value');

      if (error) throw error;

      const settingsMap: GlobalSettings = {
        owner_whatsapp: '',
        subscription_price: '97',
        default_trial_days: '7',
      };

      data?.forEach((item) => {
        if (item.key in settingsMap) {
          settingsMap[item.key as keyof GlobalSettings] = item.value;
        }
      });

      setSettings(settingsMap);
    } catch (err) {
      console.error('Error fetching settings:', err);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Direct upsert to global_settings table for reliability
      const entries = [
        { key: 'owner_whatsapp', value: settings.owner_whatsapp },
        { key: 'subscription_price', value: settings.subscription_price },
        { key: 'default_trial_days', value: settings.default_trial_days },
      ];

      for (const entry of entries) {
        const { error } = await supabase
          .from('global_settings')
          .update({ value: entry.value, updated_at: new Date().toISOString() })
          .eq('key', entry.key);

        if (error) {
          console.error(`Error saving ${entry.key}:`, error);
          throw new Error(`Erro ao salvar ${entry.key}`);
        }
      }

      toast.success('Configurações atualizadas com sucesso! ✅');
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  }

  function handleTestNotification() {
    if (!settings.owner_whatsapp) {
      toast.error('Configure o número de WhatsApp primeiro');
      return;
    }

    const message = `🧪 TESTE DE NOTIFICAÇÃO

Olá! Esta é uma mensagem de teste do sistema.
Se você está vendo isso, as notificações estão funcionando! ✅

---
Enviado pelo painel Master Admin`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${settings.owner_whatsapp}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    toast.success('Abrindo WhatsApp para teste...');
  }

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="font-display text-xl flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Configurações Globais
        </CardTitle>
        <CardDescription>
          Configure os parâmetros globais do sistema: notificações, preços e trial padrão.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* WhatsApp */}
        <div className="space-y-2">
          <Label htmlFor="owner_whatsapp">WhatsApp para Notificações</Label>
          <div className="flex gap-2">
            <Input
              id="owner_whatsapp"
              type="text"
              placeholder="5511999999999"
              value={settings.owner_whatsapp}
              onChange={(e) =>
                setSettings({ ...settings, owner_whatsapp: e.target.value.replace(/\D/g, '') })
              }
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={handleTestNotification}
              className="gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Testar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Formato: código do país + DDD + número (ex: 5511999999999)
          </p>
        </div>

        {/* Subscription Price */}
        <div className="space-y-2">
          <Label htmlFor="subscription_price">Valor da Mensalidade (R$)</Label>
          <Input
            id="subscription_price"
            type="number"
            min="0"
            step="0.01"
            placeholder="97.00"
            value={settings.subscription_price}
            onChange={(e) =>
              setSettings({ ...settings, subscription_price: e.target.value })
            }
          />
          <p className="text-xs text-muted-foreground">
            Este valor será exibido na Landing Page automaticamente.
          </p>
        </div>

        {/* Default Trial Days */}
        <div className="space-y-2">
          <Label htmlFor="default_trial_days">Dias de Trial Padrão</Label>
          <Input
            id="default_trial_days"
            type="number"
            min="1"
            max="365"
            placeholder="7"
            value={settings.default_trial_days}
            onChange={(e) =>
              setSettings({ ...settings, default_trial_days: e.target.value })
            }
          />
          <p className="text-xs text-muted-foreground">
            Quantidade de dias de teste gratuito para novas lojas.
          </p>
        </div>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Salvar Configurações
        </Button>
      </CardContent>
    </Card>
  );
}
