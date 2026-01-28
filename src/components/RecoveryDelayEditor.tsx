import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Clock } from 'lucide-react';

interface RecoveryDelayEditorProps {
  storeId: string;
  onDelayChange?: (minutes: number) => void;
}

const DELAY_OPTIONS = [
  { value: '5', label: '5 minutos' },
  { value: '10', label: '10 minutos' },
  { value: '15', label: '15 minutos' },
  { value: '30', label: '30 minutos' },
  { value: '60', label: '60 minutos' },
];

export function RecoveryDelayEditor({ storeId, onDelayChange }: RecoveryDelayEditorProps) {
  const [delay, setDelay] = useState<string>('15');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchDelay() {
      const { data } = await supabase
        .from('stores')
        .select('recovery_delay_minutes')
        .eq('id', storeId)
        .single();
      
      if (data?.recovery_delay_minutes) {
        setDelay(String(data.recovery_delay_minutes));
        onDelayChange?.(data.recovery_delay_minutes);
      }
      setLoading(false);
    }
    
    fetchDelay();
  }, [storeId, onDelayChange]);

  async function handleDelayChange(value: string) {
    setDelay(value);
    setSaving(true);
    
    const minutes = parseInt(value, 10);
    
    const { error } = await supabase
      .from('stores')
      .update({ recovery_delay_minutes: minutes })
      .eq('id', storeId);

    if (error) {
      toast.error('Erro ao salvar configuração');
    } else {
      toast.success('Tempo de abandono atualizado!');
      onDelayChange?.(minutes);
    }
    
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 glass-card rounded-lg">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary" />
        <Label className="text-base">Tempo para considerar abandono</Label>
      </div>
      
      <div className="flex items-center gap-3">
        <Select value={delay} onValueChange={handleDelayChange} disabled={saving}>
          <SelectTrigger className="w-[180px] bg-secondary border-border">
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {DELAY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {saving && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
      </div>
      
      <p className="text-xs text-muted-foreground">
        O cliente aparecerá na lista de recuperação após {delay} minutos de inatividade no checkout.
      </p>
    </div>
  );
}
