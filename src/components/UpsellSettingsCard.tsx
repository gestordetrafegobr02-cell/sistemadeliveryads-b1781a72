import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { UpsellRulesEditor } from './UpsellRulesEditor';
import { UpsellExceptionsEditor } from './UpsellExceptionsEditor';
import { UpsellProductSelector } from './UpsellProductSelector';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category_id: string | null;
}

interface UpsellSettingsCardProps {
  storeId: string;
  categories: Category[];
  products?: Product[];
}

export function UpsellSettingsCard({ storeId, categories, products = [] }: UpsellSettingsCardProps) {
  const [upsellEnabled, setUpsellEnabled] = useState(false);
  const [blockingCategories, setBlockingCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [storeId]);

  async function fetchSettings() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('upsell_enabled, upsell_blocking_categories')
        .eq('id', storeId)
        .single();

      if (error) throw error;

      setUpsellEnabled(data?.upsell_enabled ?? false);
      setBlockingCategories((data?.upsell_blocking_categories as string[]) || []);
    } catch (err) {
      console.error('Error fetching upsell settings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleUpsell(enabled: boolean) {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('stores')
        .update({ upsell_enabled: enabled })
        .eq('id', storeId);

      if (error) throw error;

      setUpsellEnabled(enabled);
      toast.success(enabled ? 'Upsell ativado!' : 'Upsell desativado!');
    } catch (err) {
      console.error('Error updating upsell:', err);
      toast.error('Erro ao atualizar configuração');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleCategory(categoryId: string, checked: boolean) {
    const newCategories = checked
      ? [...blockingCategories, categoryId]
      : blockingCategories.filter((id) => id !== categoryId);

    setSaving(true);
    try {
      const { error } = await supabase
        .from('stores')
        .update({ upsell_blocking_categories: newCategories })
        .eq('id', storeId);

      if (error) throw error;

      setBlockingCategories(newCategories);
      toast.success('Categorias atualizadas!');
    } catch (err) {
      console.error('Error updating blocking categories:', err);
      toast.error('Erro ao atualizar categorias');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Settings Card */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle className="font-display text-lg">Upsell Inteligente</CardTitle>
          </div>
          <CardDescription>
            Ofereça bebidas e complementos automaticamente antes de finalizar o pedido
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle Upsell */}
          <div className="flex items-center justify-between p-4 glass-card rounded-lg">
            <div>
              <Label className="text-base font-medium">
                {upsellEnabled ? 'Upsell Ativo' : 'Upsell Desativado'}
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                {upsellEnabled 
                  ? 'O modal de sugestões será exibido aos clientes' 
                  : 'Clientes irão direto para o checkout'}
              </p>
            </div>
            <Switch
              checked={upsellEnabled}
              onCheckedChange={handleToggleUpsell}
              disabled={saving}
            />
          </div>

          {/* Blocking Categories */}
          {upsellEnabled && categories.length > 0 && (
            <div className="space-y-3">
              <div>
                <Label className="text-base font-medium">Categorias que Bloqueiam Upsell</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Se o carrinho contiver itens dessas categorias, o upsell não será exibido
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((category) => (
                  <label
                    key={category.id}
                    className="flex items-center gap-3 p-3 glass-card rounded-lg cursor-pointer hover:bg-secondary/80 transition-colors"
                  >
                    <Checkbox
                      checked={blockingCategories.includes(category.id)}
                      onCheckedChange={(checked) => 
                        handleToggleCategory(category.id, checked === true)
                      }
                      disabled={saving}
                    />
                    <span className="text-sm font-medium">{category.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground italic">
                💡 Dica: Marque "Combos" para não oferecer bebidas a quem já comprou um combo com bebida.
              </p>
            </div>
          )}

          {!upsellEnabled && (
            <div className="text-center py-4 text-muted-foreground">
              <p className="text-sm">Ative o upsell para configurar categorias de bloqueio</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exceptions Editor - Only show if upsell enabled and there are blocking categories */}
      {upsellEnabled && blockingCategories.length > 0 && (
        <UpsellExceptionsEditor
          storeId={storeId}
          categories={categories}
          products={products}
          blockingCategories={blockingCategories}
        />
      )}

      {/* Product Selector - Show if upsell enabled */}
      {upsellEnabled && products.length > 0 && (
        <UpsellProductSelector
          storeId={storeId}
          products={products}
          categories={categories}
        />
      )}

      {/* Rules Editor - Only show if upsell enabled */}
      {upsellEnabled && products.length > 0 && (
        <UpsellRulesEditor
          storeId={storeId}
          products={products}
        />
      )}
    </div>
  );
}