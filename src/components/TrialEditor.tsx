import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

  async function handleSave() {
    if (!date) return;

    setSaving(true);
    try {
      // Using type assertion since types may not be updated yet
      const { error } = await supabase.rpc('update_store_trial' as never, {
        p_store_id: storeId,
        p_trial_expires_at: date.toISOString(),
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
            'Definir'
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 border-b">
          <p className="text-sm font-medium">Período de Teste</p>
          <div className="flex gap-2 mt-2">
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
        </div>
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
          className={cn('p-3 pointer-events-auto')}
          locale={ptBR}
        />
        <div className="p-3 border-t flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!date || saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
