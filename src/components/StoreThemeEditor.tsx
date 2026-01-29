import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Palette, Save, RotateCcw, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StoreThemeEditorProps {
  storeId: string;
  currentColor: string | null;
  onColorChange: (color: string | null) => void;
}

// Pre-defined color palette with common store theme colors
const PRESET_COLORS = [
  { name: 'Laranja', value: '#F97316' },
  { name: 'Vermelho', value: '#EF4444' },
  { name: 'Verde', value: '#22C55E' },
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Roxo', value: '#8B5CF6' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Amarelo', value: '#EAB308' },
  { name: 'Turquesa', value: '#14B8A6' },
];

export function StoreThemeEditor({ storeId, currentColor, onColorChange }: StoreThemeEditorProps) {
  const [color, setColor] = useState(currentColor || '#F97316');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('stores')
        .update({ primary_color: color })
        .eq('id', storeId);

      if (error) throw error;

      onColorChange(color);
      toast.success('Cor personalizada salva!');
    } catch (err) {
      console.error('Error saving color:', err);
      toast.error('Erro ao salvar cor');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('stores')
        .update({ primary_color: null })
        .eq('id', storeId);

      if (error) throw error;

      setColor('#F97316');
      onColorChange(null);
      toast.success('Cor restaurada ao padrão');
    } catch (err) {
      console.error('Error resetting color:', err);
      toast.error('Erro ao restaurar cor');
    } finally {
      setSaving(false);
    }
  }

  const isCurrentSaved = color === currentColor;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="font-display text-xl flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Personalização
        </CardTitle>
        <CardDescription>
          Escolha a cor principal da sua loja. Ela será aplicada aos botões, ícones e destaques do cardápio.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Color Picker */}
        <div className="space-y-3">
          <Label>Cor Principal</Label>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-16 h-16 p-1 cursor-pointer rounded-lg border-2"
                style={{ backgroundColor: color }}
              />
            </div>
            <div className="flex-1">
              <Input
                type="text"
                value={color.toUpperCase()}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                    setColor(val);
                  }
                }}
                placeholder="#F97316"
                className="font-mono bg-secondary border-border"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Código HEX da cor
              </p>
            </div>
          </div>
        </div>

        {/* Preset Colors */}
        <div className="space-y-3">
          <Label>Cores Sugeridas</Label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => setColor(preset.value)}
                className="relative w-10 h-10 rounded-lg transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                style={{ backgroundColor: preset.value }}
                title={preset.name}
              >
                {color === preset.value && (
                  <Check className="absolute inset-0 m-auto w-5 h-5 text-white drop-shadow-md" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <Label>Pré-visualização</Label>
          <div className="bg-secondary/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-6 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="font-semibold">Categoria Exemplo</span>
            </div>
            <button
              className="w-full py-3 rounded-xl text-white font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: color }}
            >
              Finalizar Pedido
            </button>
            <div className="flex gap-2">
              <span
                className="px-3 py-1 rounded-full text-sm text-white"
                style={{ backgroundColor: color }}
              >
                Categoria Ativa
              </span>
              <span className="px-3 py-1 rounded-full text-sm bg-muted text-muted-foreground">
                Outra Categoria
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={saving || isCurrentSaved}
            className="flex-1 gap-2"
            style={{ backgroundColor: isCurrentSaved ? undefined : color }}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isCurrentSaved ? 'Salvo' : 'Salvar Cor'}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving || !currentColor}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Padrão
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          💡 A cor escolhida será aplicada aos botões, categorias e destaques da sua loja. O fundo permanece branco/claro para garantir uma boa leitura.
        </p>
      </CardContent>
    </Card>
  );
}
