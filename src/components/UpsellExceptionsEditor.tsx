import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, Package } from 'lucide-react';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  category_id: string | null;
}

interface UpsellExceptionsEditorProps {
  storeId: string;
  categories: Category[];
  products: Product[];
  blockingCategories: string[];
}

export function UpsellExceptionsEditor({ 
  storeId, 
  categories, 
  products, 
  blockingCategories 
}: UpsellExceptionsEditorProps) {
  const [exceptionProducts, setExceptionProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchExceptions();
  }, [storeId]);

  async function fetchExceptions() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('upsell_exception_products')
        .eq('id', storeId)
        .single();

      if (error) throw error;
      setExceptionProducts((data?.upsell_exception_products as string[]) || []);
    } catch (err) {
      console.error('Error fetching exceptions:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleException(productId: string, isException: boolean) {
    const newExceptions = isException
      ? [...exceptionProducts, productId]
      : exceptionProducts.filter(id => id !== productId);

    setSaving(true);
    try {
      const { error } = await supabase
        .from('stores')
        .update({ upsell_exception_products: newExceptions })
        .eq('id', storeId);

      if (error) throw error;

      setExceptionProducts(newExceptions);
      toast.success(isException 
        ? 'Produto adicionado às exceções!' 
        : 'Exceção removida!'
      );
    } catch (err) {
      console.error('Error updating exceptions:', err);
      toast.error('Erro ao atualizar exceções');
    } finally {
      setSaving(false);
    }
  }

  // Filter categories that are in the blocking list
  const blockedCategories = categories.filter(c => blockingCategories.includes(c.id));
  
  // Get products grouped by blocked category
  const productsByBlockedCategory = blockedCategories.map(category => ({
    category,
    products: products.filter(p => p.category_id === category.id)
  })).filter(group => group.products.length > 0);

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (blockingCategories.length === 0) {
    return null; // Don't show if no categories are blocking
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <CardTitle className="font-display text-lg">Exceções de Bloqueio</CardTitle>
        </div>
        <CardDescription>
          Produtos das categorias bloqueadas que <strong>NÃO</strong> devem bloquear o upsell
        </CardDescription>
      </CardHeader>
      <CardContent>
        {productsByBlockedCategory.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum produto nas categorias bloqueadas</p>
          </div>
        ) : (
          <Accordion type="multiple" className="w-full">
            {productsByBlockedCategory.map(({ category, products: categoryProducts }) => (
              <AccordionItem key={category.id} value={category.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{category.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({categoryProducts.length} produtos)
                    </span>
                    {categoryProducts.some(p => exceptionProducts.includes(p.id)) && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                        {categoryProducts.filter(p => exceptionProducts.includes(p.id)).length} exceções
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pl-2">
                    <p className="text-xs text-muted-foreground mb-3">
                      Marque os produtos que <strong>NÃO</strong> bloqueiam upsell (ex: combos sem bebida)
                    </p>
                    {categoryProducts.map((product) => (
                      <label
                        key={product.id}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          exceptionProducts.includes(product.id)
                            ? 'bg-primary/10 border border-primary/30'
                            : 'glass-card hover:bg-secondary/80'
                        }`}
                      >
                        <Checkbox
                          checked={exceptionProducts.includes(product.id)}
                          onCheckedChange={(checked) => 
                            handleToggleException(product.id, checked === true)
                          }
                          disabled={saving}
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium">{product.name}</span>
                          {exceptionProducts.includes(product.id) && (
                            <p className="text-xs text-primary mt-0.5">
                              ✓ Este produto não bloqueia upsell
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
        
        <p className="text-xs text-muted-foreground italic mt-4">
          💡 Exemplo: Se "Combo Família" não inclui bebida, marque-o como exceção para continuar oferecendo bebidas.
        </p>
      </CardContent>
    </Card>
  );
}
