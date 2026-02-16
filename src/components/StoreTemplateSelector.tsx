import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Palette, Save, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { STORE_TEMPLATES } from '@/lib/storeTemplates';

interface StoreTemplateSelectorProps {
  storeId: string;
  currentTemplate: string;
  onTemplateChange: (template: string) => void;
}

export function StoreTemplateSelector({ storeId, currentTemplate, onTemplateChange }: StoreTemplateSelectorProps) {
  const [selected, setSelected] = useState(currentTemplate || 'default');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('stores')
        .update({ store_template_style: selected })
        .eq('id', storeId);

      if (error) throw error;

      onTemplateChange(selected);
      toast.success('Visual do cardápio atualizado!');
    } catch (err) {
      console.error('Error saving template:', err);
      toast.error('Erro ao salvar template');
    } finally {
      setSaving(false);
    }
  }

  const isSaved = selected === currentTemplate;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="font-display text-xl flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Visual do Cardápio
        </CardTitle>
        <CardDescription>
          Escolha o estilo visual da sua loja. As cores e fundo serão aplicados automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.values(STORE_TEMPLATES).map((template) => (
            <button
              key={template.id}
              onClick={() => setSelected(template.id)}
              className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                selected === template.id
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              {selected === template.id && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              {/* Preview swatch */}
              <div className="flex gap-2 mb-3">
                <div
                  className="w-8 h-8 rounded-lg border"
                  style={{ backgroundColor: `hsl(${template.background})` }}
                  title="Fundo"
                />
                <div
                  className="w-8 h-8 rounded-lg border"
                  style={{ backgroundColor: `hsl(${template.primary})` }}
                  title="Principal"
                />
                <div
                  className="w-8 h-8 rounded-lg border"
                  style={{ backgroundColor: `hsl(${template.card})` }}
                  title="Card"
                />
              </div>
              <h4 className="font-semibold text-sm text-foreground">{template.name}</h4>
              <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
            </button>
          ))}
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || isSaved}
          className="w-full gap-2"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaved ? 'Salvo' : 'Aplicar Visual'}
        </Button>
      </CardContent>
    </Card>
  );
}
