import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Palette, Save, RotateCcw, Loader2, Check, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StoreThemeEditorProps {
  storeId: string;
  currentColor: string | null;
  currentBgColor: string | null;
  currentCardStyle: string | null;
  onThemeChange: (theme: { primary_color: string | null; bg_color: string | null; card_style: string | null }) => void;
}

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

const BG_PRESET_COLORS = [
  { name: 'Branco', value: '#FFFFFF' },
  { name: 'Creme', value: '#FFFBEB' },
  { name: 'Rosa Claro', value: '#FDF2F8' },
  { name: 'Cinza Claro', value: '#F8FAFC' },
  { name: 'Verde Claro', value: '#F0FDF4' },
  { name: 'Azul Claro', value: '#EFF6FF' },
  { name: 'Escuro', value: '#1A1A2E' },
  { name: 'Preto', value: '#0A0A0A' },
];

export function StoreThemeEditor({ storeId, currentColor, currentBgColor, currentCardStyle, onThemeChange }: StoreThemeEditorProps) {
  const [primaryColor, setPrimaryColor] = useState(currentColor || '#F97316');
  const [bgColor, setBgColor] = useState(currentBgColor || '#FFFFFF');
  const [cardStyle, setCardStyle] = useState<string>(currentCardStyle || 'rounded');
  const [saving, setSaving] = useState(false);

  const hasChanges = primaryColor !== (currentColor || '#F97316') ||
    bgColor !== (currentBgColor || '#FFFFFF') ||
    cardStyle !== (currentCardStyle || 'rounded');

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('stores')
        .update({ primary_color: primaryColor, bg_color: bgColor, card_style: cardStyle })
        .eq('id', storeId);

      if (error) throw error;

      onThemeChange({ primary_color: primaryColor, bg_color: bgColor, card_style: cardStyle });
      toast.success('Tema salvo com sucesso!');
    } catch (err) {
      console.error('Error saving theme:', err);
      toast.error('Erro ao salvar tema');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('stores')
        .update({ primary_color: null, bg_color: null, card_style: 'rounded' })
        .eq('id', storeId);

      if (error) throw error;

      setPrimaryColor('#F97316');
      setBgColor('#FFFFFF');
      setCardStyle('rounded');
      onThemeChange({ primary_color: null, bg_color: null, card_style: 'rounded' });
      toast.success('Tema restaurado ao padrão');
    } catch (err) {
      console.error('Error resetting theme:', err);
      toast.error('Erro ao restaurar tema');
    } finally {
      setSaving(false);
    }
  }

  function applyGourmetPreset() {
    setPrimaryColor('#FF69B4');
    setBgColor('#FDF2F8');
    setCardStyle('rounded');
    toast.info('Tema Gourmet aplicado! Clique em Salvar para confirmar.');
  }

  // Determine if bg is dark for preview text color
  const isDarkBg = isColorDark(bgColor);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="font-display text-xl flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Personalização Visual
        </CardTitle>
        <CardDescription>
          Personalize as cores, fundo e estilo dos cards da sua loja.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Primary Color Picker */}
        <div className="space-y-3">
          <Label>Cor Principal da Marca</Label>
          <div className="flex items-center gap-4">
            <Input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-14 h-14 p-1 cursor-pointer rounded-lg border-2"
            />
            <div className="flex-1">
              <Input
                type="text"
                value={primaryColor.toUpperCase()}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) setPrimaryColor(val);
                }}
                placeholder="#F97316"
                className="font-mono bg-secondary border-border"
              />
            </div>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => setPrimaryColor(preset.value)}
                className="relative w-10 h-10 rounded-lg transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                style={{ backgroundColor: preset.value }}
                title={preset.name}
              >
                {primaryColor === preset.value && (
                  <Check className="absolute inset-0 m-auto w-5 h-5 text-white drop-shadow-md" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Background Color Picker */}
        <div className="space-y-3">
          <Label>Cor de Fundo da Loja</Label>
          <div className="flex items-center gap-4">
            <Input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="w-14 h-14 p-1 cursor-pointer rounded-lg border-2"
            />
            <div className="flex-1">
              <Input
                type="text"
                value={bgColor.toUpperCase()}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) setBgColor(val);
                }}
                placeholder="#FFFFFF"
                className="font-mono bg-secondary border-border"
              />
            </div>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {BG_PRESET_COLORS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => setBgColor(preset.value)}
                className="relative w-10 h-10 rounded-lg transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border border-border"
                style={{ backgroundColor: preset.value }}
                title={preset.name}
              >
                {bgColor === preset.value && (
                  <Check className={`absolute inset-0 m-auto w-5 h-5 drop-shadow-md ${isColorDark(preset.value) ? 'text-white' : 'text-gray-800'}`} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Card Style Toggle */}
        <div className="space-y-3">
          <Label>Estilo da Loja</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setCardStyle('rounded')}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                cardStyle === 'rounded'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <div className="w-full h-12 rounded-2xl bg-muted mb-2" />
              <span className="text-sm font-medium">Modo Gourmet</span>
              <p className="text-xs text-muted-foreground">Arredondado</p>
            </button>
            <button
              onClick={() => setCardStyle('square')}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                cardStyle === 'square'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <div className="w-full h-12 rounded-sm bg-muted mb-2" />
              <span className="text-sm font-medium">Modo Moderno</span>
              <p className="text-xs text-muted-foreground">Reto</p>
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <Label>Pré-visualização</Label>
          <div
            className="p-4 space-y-3"
            style={{
              backgroundColor: bgColor,
              borderRadius: cardStyle === 'rounded' ? '20px' : '4px',
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-6 rounded-full"
                style={{ backgroundColor: primaryColor }}
              />
              <span className="font-semibold" style={{ color: isDarkBg ? '#fff' : '#1a1a1a' }}>
                Categoria Exemplo
              </span>
            </div>
            <button
              className="w-full py-3 text-white font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: primaryColor, borderRadius: cardStyle === 'rounded' ? '16px' : '4px' }}
            >
              Finalizar Pedido
            </button>
            <div className="flex gap-2">
              <span
                className="px-3 py-1 text-sm text-white"
                style={{ backgroundColor: primaryColor, borderRadius: cardStyle === 'rounded' ? '9999px' : '4px' }}
              >
                Ativa
              </span>
              <span
                className="px-3 py-1 text-sm"
                style={{
                  backgroundColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  color: isDarkBg ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
                  borderRadius: cardStyle === 'rounded' ? '9999px' : '4px',
                }}
              >
                Inativa
              </span>
            </div>
          </div>
        </div>

        {/* Gourmet Preset */}
        <Button
          variant="outline"
          onClick={applyGourmetPreset}
          className="w-full gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Aplicar Tema Gourmet
        </Button>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex-1 gap-2"
            style={{ backgroundColor: hasChanges ? primaryColor : undefined }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {hasChanges ? 'Salvar Tema' : 'Salvo'}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Padrão
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          💡 As cores e estilo serão aplicados em toda a loja: botões, categorias, cards e fundo.
        </p>
      </CardContent>
    </Card>
  );
}

function isColorDark(hex: string): boolean {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return false;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}
