import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Settings2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Modifier {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  sort_order: number;
}

interface ProductModifiersEditorProps {
  productId: string;
  productName: string;
}

export function ProductModifiersEditor({ productId, productName }: ProductModifiersEditorProps) {
  const [open, setOpen] = useState(false);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New modifier form
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');

  useEffect(() => {
    if (open) {
      fetchModifiers();
    }
  }, [open, productId]);

  async function fetchModifiers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('product_modifiers')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order');

    if (error) {
      toast.error('Erro ao carregar adicionais');
    } else {
      setModifiers(data || []);
    }
    setLoading(false);
  }

  async function handleAddModifier() {
    if (!newName.trim() || !newPrice.trim()) {
      toast.error('Preencha nome e preço');
      return;
    }

    setSaving(true);
    const price = parseFloat(newPrice.replace(',', '.'));

    const { error } = await supabase.from('product_modifiers').insert({
      product_id: productId,
      name: newName.trim(),
      price: price,
      sort_order: modifiers.length,
    });

    if (error) {
      toast.error('Erro ao adicionar adicional');
    } else {
      toast.success('Adicional criado!');
      setNewName('');
      setNewPrice('');
      fetchModifiers();
    }
    setSaving(false);
  }

  async function handleDeleteModifier(id: string) {
    const { error } = await supabase.from('product_modifiers').delete().eq('id', id);

    if (error) {
      toast.error('Erro ao excluir');
    } else {
      toast.success('Adicional excluído');
      setModifiers((prev) => prev.filter((m) => m.id !== id));
    }
  }

  async function handleToggleAvailable(id: string, isAvailable: boolean) {
    const { error } = await supabase
      .from('product_modifiers')
      .update({ is_available: isAvailable })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar');
    } else {
      setModifiers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_available: isAvailable } : m))
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Gerenciar adicionais">
          <Settings2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            Adicionais: {productName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Add new modifier */}
          <div className="p-4 glass-card rounded-lg space-y-3">
            <Label className="text-foreground font-medium">Novo Adicional</Label>
            <div className="grid grid-cols-5 gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Bacon Extra"
                className="col-span-3 bg-secondary border-border"
              />
              <Input
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="3,00"
                className="bg-secondary border-border"
              />
              <Button
                onClick={handleAddModifier}
                disabled={saving}
                className="bg-primary text-primary-foreground"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* List of existing modifiers */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : modifiers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum adicional cadastrado.
            </p>
          ) : (
            <div className="space-y-2">
              {modifiers.map((modifier) => (
                <div
                  key={modifier.id}
                  className="flex items-center justify-between p-3 glass-card"
                >
                  <div className="flex-1">
                    <p className={`font-medium ${!modifier.is_available ? 'text-muted-foreground line-through' : ''}`}>
                      {modifier.name}
                    </p>
                    <p className="text-sm text-primary">
                      + R$ {Number(modifier.price).toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={modifier.is_available}
                      onCheckedChange={(checked) => handleToggleAvailable(modifier.id, checked)}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteModifier(modifier.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
