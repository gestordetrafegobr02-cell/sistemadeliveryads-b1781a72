import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Clock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OpeningHours, DayHours } from '@/lib/storeHours';
import { Json } from '@/integrations/supabase/types';

interface StoreHoursEditorProps {
  storeId: string;
  currentHours: OpeningHours | null;
  onSave: () => void;
}

const DAYS: { key: keyof OpeningHours; label: string }[] = [
  { key: 'monday', label: 'Segunda-feira' },
  { key: 'tuesday', label: 'Terça-feira' },
  { key: 'wednesday', label: 'Quarta-feira' },
  { key: 'thursday', label: 'Quinta-feira' },
  { key: 'friday', label: 'Sexta-feira' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

const DEFAULT_HOURS: DayHours = { open: '08:00', close: '22:00' };

export function StoreHoursEditor({ storeId, currentHours, onSave }: StoreHoursEditorProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hours, setHours] = useState<OpeningHours>(() => {
    return currentHours || {
      monday: DEFAULT_HOURS,
      tuesday: DEFAULT_HOURS,
      wednesday: DEFAULT_HOURS,
      thursday: DEFAULT_HOURS,
      friday: DEFAULT_HOURS,
      saturday: DEFAULT_HOURS,
      sunday: DEFAULT_HOURS,
    };
  });
  const [closedDays, setClosedDays] = useState<Record<string, boolean>>(() => {
    const closed: Record<string, boolean> = {};
    DAYS.forEach(({ key }) => {
      closed[key] = !currentHours?.[key]?.open;
    });
    return closed;
  });

  const handleTimeChange = (day: keyof OpeningHours, field: 'open' | 'close', value: string) => {
    setHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleClosedToggle = (day: keyof OpeningHours, isClosed: boolean) => {
    setClosedDays((prev) => ({ ...prev, [day]: isClosed }));
    if (isClosed) {
      setHours((prev) => ({
        ...prev,
        [day]: undefined,
      }));
    } else {
      setHours((prev) => ({
        ...prev,
        [day]: DEFAULT_HOURS,
      }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    
    // Build opening_hours object, excluding closed days
    const openingHours: Record<string, DayHours | undefined> = {};
    DAYS.forEach(({ key }) => {
      if (!closedDays[key] && hours[key]) {
        openingHours[key] = hours[key];
      }
    });

    const { error } = await supabase
      .from('stores')
      .update({ opening_hours: JSON.parse(JSON.stringify(openingHours)) })
      .eq('id', storeId);

    setSaving(false);

    if (error) {
      toast.error('Erro ao salvar horários');
    } else {
      toast.success('Horários atualizados!');
      onSave();
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Clock className="w-4 h-4" />
          Configurar Horários
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Horários de Funcionamento</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Configure os horários de abertura e fechamento para cada dia da semana. 
            Os horários são informativos - use o botão "Abrir/Fechar Loja" para controlar o status em tempo real.
          </p>

          {DAYS.map(({ key, label }) => (
            <div key={key} className="p-3 glass-card rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-medium">{label}</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {closedDays[key] ? 'Fechado' : 'Aberto'}
                  </span>
                  <Switch
                    checked={!closedDays[key]}
                    onCheckedChange={(checked) => handleClosedToggle(key, !checked)}
                  />
                </div>
              </div>

              {!closedDays[key] && (
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Abertura</Label>
                    <Input
                      type="time"
                      value={hours[key]?.open || '08:00'}
                      onChange={(e) => handleTimeChange(key, 'open', e.target.value)}
                      className="bg-secondary border-border"
                    />
                  </div>
                  <span className="text-muted-foreground mt-5">até</span>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Fechamento</Label>
                    <Input
                      type="time"
                      value={hours[key]?.close || '22:00'}
                      onChange={(e) => handleTimeChange(key, 'close', e.target.value)}
                      className="bg-secondary border-border"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          <Button onClick={handleSave} disabled={saving} className="w-full btn-glow">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Horários
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
