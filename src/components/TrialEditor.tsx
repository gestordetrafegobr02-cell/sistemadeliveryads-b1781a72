import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, Plus } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface TrialEditorProps {
  storeId: string;
  currentTrialDate: string | null;
  onUpdate: (newDate: string) => void;
}

export default function TrialEditor({ storeId, currentTrialDate, onUpdate }: TrialEditorProps) {
  const [date, setDate] = useState<Date | undefined>(
    currentTrialDate ? new Date(currentTrialDate) : undefined
  );
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [daysToAdd, setDaysToAdd] = useState('');

  async function handleSave() {
    if (!date) return;

    setSaving(true);
    try {
      const { error } = await supabase.rpc('update_store_trial' as never, {
        p_store_id: storeId,
        p_trial_date: date.toISOString(),
      } as never);

      if (error) throw error;

      toast.success('Período de teste atualizado!');
      onUpdate(date.toISOString());
      setOpen(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  function handleAddDays() {
    const days = parseInt(daysToAdd);
    if (isNaN(days) || days <= 0) {
      toast.error('Informe um número válido de dias');
      return;
    }
    setDate(addDays(new Date(), days));
    setDaysToAdd('');
  }

  function handleRemoveTrial() {
    setDate(undefined);
  }

  async function handleSaveUnlimited() {
    setSaving(true);
    try {
      // Set trial to null (unlimited)
      const { error } = await supabase
        .from('stores')
        .update({ trial_expires_at: null })
        .eq('id', storeId);

      if (error) throw error;

      toast.success('Trial removido - Acesso ilimitado!');
      onUpdate('');
      setOpen(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  const isExpired = currentTrialDate ? new Date(currentTrialDate) < new Date() : false;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'w-[140px] justify-start text-left font-normal text-xs',
            isExpired && 'border-red-500/50 text-red-500'
          )}
        >
          <CalendarIcon className="mr-1 h-3 w-3" />
          {currentTrialDate ? (
            format(new Date(currentTrialDate), 'dd/MM/yyyy', { locale: ptBR })
          ) : (
            'Ilimitado'
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 border-b space-y-3">
          <p className="text-sm font-medium">Período de Teste</p>
          
          {/* Quick add buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDate(addDays(new Date(), 7))}
            >
              +7 dias
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDate(addDays(new Date(), 14))}
            >
              +14 dias
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDate(addDays(new Date(), 30))}
            >
              +30 dias
            </Button>
          </div>

          {/* Custom days input */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Ou digite:</Label>
            <Input
              type="number"
              min="1"
              max="365"
              placeholder="Dias"
              value={daysToAdd}
              onChange={(e) => setDaysToAdd(e.target.value)}
              className="w-20 h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddDays();
                }
              }}
            />
            <Button size="sm" variant="outline" onClick={handleAddDays} className="h-8">
              <Plus className="w-3 h-3" />
            </Button>
          </div>

          {/* Selected date preview */}
          {date && (
            <p className="text-xs text-muted-foreground">
              Novo vencimento: {format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          )}
        </div>
        
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
          className={cn('p-3 pointer-events-auto')}
          locale={ptBR}
        />
        
        <div className="p-3 border-t space-y-2">
          <div className="flex justify-between gap-2">
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleSaveUnlimited}
              disabled={saving}
              className="text-xs"
            >
              Tornar Ilimitado
            </Button>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!date || saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
