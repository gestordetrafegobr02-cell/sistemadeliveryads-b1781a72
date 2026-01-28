import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, Settings } from 'lucide-react';
import { toast } from 'sonner';

export function DefaultTrialSettings() {
  const [trialDays, setTrialDays] = useState<string>('14');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSetting();
  }, []);

  async function fetchSetting() {
    try {
      const { data } = await supabase.rpc('get_platform_setting' as never, {
        p_key: 'default_trial_days',
      } as never);
      
      if (data !== null) {
        setTrialDays(String(data));
      }
    } catch (err) {
      console.error('Error fetching trial setting:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    const days = parseInt(trialDays) || 0;
    if (days < 0 || days > 365) {
      toast.error('Informe um valor entre 0 e 365 dias');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.rpc('update_platform_setting' as never, {
        p_key: 'default_trial_days',
        p_value: days,
      } as never);

      if (error) throw error;
      toast.success('Configuração salva!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Configuração de Trial Padrão</CardTitle>
        </div>
        <CardDescription>
          Define quantos dias de teste novos lojistas recebem ao criar uma conta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-4">
          <div className="space-y-2 flex-1">
            <Label htmlFor="defaultTrialDays">Dias de Teste para Novos Cadastros</Label>
            <Input
              id="defaultTrialDays"
              type="number"
              min="0"
              max="365"
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              className="w-32"
            />
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </Button>
        </div>
        
        <div className="flex gap-2">
          {[0, 7, 14, 30].map((days) => (
            <Button
              key={days}
              type="button"
              size="sm"
              variant={trialDays === String(days) ? 'default' : 'outline'}
              onClick={() => setTrialDays(String(days))}
            >
              {days === 0 ? 'Nenhum' : `${days} dias`}
            </Button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          {parseInt(trialDays) === 0
            ? '⚠️ Com 0 dias, nenhum lojista terá trial automático. Você precisará liberar manualmente.'
            : `Novos lojistas terão ${trialDays} dias de teste gratuito.`}
        </p>
      </CardContent>
    </Card>
  );
}
