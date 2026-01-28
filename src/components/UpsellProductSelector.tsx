import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Package, Save, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
  image_url: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface UpsellProductSelectorProps {
  storeId: string;
  products: Product[];
  categories: Category[];
}

export function UpsellProductSelector({ storeId, products, categories }: UpsellProductSelectorProps) {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [initialProducts, setInitialProducts] = useState<string[]>([]);
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
        .select('upsell_products')
        .eq('id', storeId)
        .single();

      if (error) throw error;

      const currentProducts = (data?.upsell_products as string[]) || [];
      setSelectedProducts(currentProducts);
      setInitialProducts(currentProducts);
    } catch (err) {
      console.error('Error fetching upsell products:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleToggleProduct(productId: string, checked: boolean) {
    if (checked) {
      if (selectedProducts.length >= 5) {
        toast.error('Máximo de 5 produtos para upsell');
        return;
      }
      setSelectedProducts([...selectedProducts, productId]);
    } else {
      setSelectedProducts(selectedProducts.filter((id) => id !== productId));
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('stores')
        .update({ upsell_products: selectedProducts })
        .eq('id', storeId);

      if (error) throw error;

      setInitialProducts(selectedProducts);
      toast.success('Produtos de upsell salvos com sucesso!', {
        icon: <Check className="w-4 h-4 text-green-500" />,
      });
    } catch (err) {
      console.error('Error saving upsell products:', err);
      toast.error('Erro ao salvar produtos');
    } finally {
      setSaving(false);
    }
  }

  const hasChanges = JSON.stringify(selectedProducts.sort()) !== JSON.stringify(initialProducts.sort());

  // Group products by category
  const productsByCategory = categories.map((category) => ({
    ...category,
    products: products.filter((p) => p.category_id === category.id),
  })).filter((cat) => cat.products.length > 0);

  const uncategorizedProducts = products.filter((p) => !p.category_id);

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
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          <CardTitle className="font-display text-lg">Produtos para Upsell</CardTitle>
        </div>
        <CardDescription>
          Selecione até 5 produtos que serão sugeridos aos clientes. Esses produtos têm prioridade sobre sugestões automáticas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected count */}
        <div className="flex items-center justify-between p-3 glass-card rounded-lg">
          <span className="text-sm text-muted-foreground">
            Produtos selecionados: <span className="font-bold text-foreground">{selectedProducts.length}/5</span>
          </span>
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            size="sm"
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar
          </Button>
        </div>

        {/* Products by category */}
        <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
          {productsByCategory.map((category) => (
            <div key={category.id} className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <span className="w-1.5 h-4 bg-primary rounded-full" />
                {category.name}
              </h4>
              <div className="grid gap-2">
                {category.products.map((product) => (
                  <ProductCheckbox
                    key={product.id}
                    product={product}
                    checked={selectedProducts.includes(product.id)}
                    onCheckedChange={(checked) => handleToggleProduct(product.id, checked)}
                    disabled={saving || (!selectedProducts.includes(product.id) && selectedProducts.length >= 5)}
                  />
                ))}
              </div>
            </div>
          ))}

          {uncategorizedProducts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <span className="w-1.5 h-4 bg-muted-foreground rounded-full" />
                Sem categoria
              </h4>
              <div className="grid gap-2">
                {uncategorizedProducts.map((product) => (
                  <ProductCheckbox
                    key={product.id}
                    product={product}
                    checked={selectedProducts.includes(product.id)}
                    onCheckedChange={(checked) => handleToggleProduct(product.id, checked)}
                    disabled={saving || (!selectedProducts.includes(product.id) && selectedProducts.length >= 5)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {products.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">Nenhum produto disponível para seleção</p>
          </div>
        )}

        <p className="text-xs text-muted-foreground italic">
          💡 Dica: Produtos selecionados aqui serão exibidos quando não houver regras específicas de upsell para o item no carrinho.
        </p>
      </CardContent>
    </Card>
  );
}

interface ProductCheckboxProps {
  product: Product;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled: boolean;
}

function ProductCheckbox({ product, checked, onCheckedChange, disabled }: ProductCheckboxProps) {
  return (
    <label
      className={`flex items-center gap-3 p-3 glass-card rounded-lg cursor-pointer transition-all ${
        checked 
          ? 'ring-2 ring-primary/50 bg-primary/10' 
          : disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:bg-secondary/80'
      }`}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(val) => onCheckedChange(val === true)}
        disabled={disabled}
      />
      {product.image_url && (
        <img
          src={product.image_url}
          alt={product.name}
          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium block truncate">{product.name}</span>
        <span className="text-xs text-muted-foreground">
          R$ {product.price.toFixed(2).replace('.', ',')}
        </span>
      </div>
    </label>
  );
}
