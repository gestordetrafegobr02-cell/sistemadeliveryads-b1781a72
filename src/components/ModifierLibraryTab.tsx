import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Loader2, Pencil, FolderPlus, PackageCheck } from 'lucide-react';
import { toast } from 'sonner';

interface LibraryItem {
  id: string;
  store_id: string;
  group_name: string;
  name: string;
  price: number;
  is_available: boolean;
  group_max: number | null;
  group_min: number;
  is_default: boolean;
  group_sort: number;
  sort_order: number;

}

interface ProductLite {
  id: string;
  name: string;
}

interface Props {
  storeId: string;
  products: ProductLite[];
}

const db = supabase as any;

export function ModifierLibraryTab({ storeId, products }: Props) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryItem | null>(null);
  const [applyGroup, setApplyGroup] = useState<string | null>(null);

  // Form state
  const [fName, setFName] = useState('');
  const [fPrice, setFPrice] = useState('');
  const [fGroup, setFGroup] = useState('Acompanhamentos');
  const [fNewGroup, setFNewGroup] = useState('');
  const [fMax, setFMax] = useState('');
  const [fAvailable, setFAvailable] = useState(true);
  const [fFree, setFFree] = useState(false);
  const [fMin, setFMin] = useState('');
  const [fDefault, setFDefault] = useState(false);



  useEffect(() => {
    if (storeId) fetchItems();
  }, [storeId]);

  async function fetchItems() {
    setLoading(true);
    const { data, error } = await db
      .from('modifier_library')
      .select('*')
      .eq('store_id', storeId)
      .order('group_sort', { ascending: true })
      .order('sort_order', { ascending: true });
    if (error) {
      toast.error('Erro ao carregar biblioteca');
    } else {
      setItems((data as LibraryItem[]) || []);
    }
    setLoading(false);
  }

  const groups = useMemo(() => {
    const map = new Map<string, LibraryItem[]>();
    items.forEach((it) => {
      const list = map.get(it.group_name) || [];
      list.push(it);
      map.set(it.group_name, list);
    });
    return Array.from(map.entries()).sort((a, b) => {
      const oa = a[1][0]?.group_sort ?? 0;
      const ob = b[1][0]?.group_sort ?? 0;
      return oa - ob;
    });
  }, [items]);

  const existingGroupNames = useMemo(
    () => Array.from(new Set(items.map((i) => i.group_name))).sort(),
    [items]
  );

  function openAdd(group?: string) {
    setEditing(null);
    setFName('');
    setFPrice('');
    setFGroup(group || existingGroupNames[0] || 'Acompanhamentos');
    setFNewGroup('');
    setFMax('');
    setFAvailable(true);
    setFFree(false);
    setFMin('');
    setFDefault(false);
    setAddOpen(true);
  }

  function openEdit(it: LibraryItem) {
    setEditing(it);
    setFName(it.name);
    setFPrice(String(it.price).replace('.', ','));
    setFGroup(it.group_name);
    setFNewGroup('');
    setFMax(it.group_max != null ? String(it.group_max) : '');
    setFAvailable(it.is_available);
    setFFree(Number(it.price) === 0);
    setFMin(it.group_min ? String(it.group_min) : '');
    setFDefault(Boolean(it.is_default));
    setAddOpen(true);
  }


  async function handleSave() {
    if (!fName.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    const groupName = (fNewGroup.trim() || fGroup.trim()) || 'Acompanhamentos';
    const price = fFree ? 0 : parseFloat((fPrice || '0').replace(',', '.'));
    if (isNaN(price) || price < 0) {
      toast.error('Preço inválido');
      return;
    }
    const groupMax = fMax.trim() ? parseInt(fMax, 10) : null;

    setSaving(true);
    if (editing) {
      const { error } = await db
        .from('modifier_library')
        .update({
          name: fName.trim(),
          price,
          group_name: groupName,
          group_max: groupMax,
          is_available: fAvailable,
        })
        .eq('id', editing.id);
      if (error) {
        toast.error('Erro ao salvar: ' + error.message);
      } else {
        toast.success('Atualizado! Aplicado em todos os produtos vinculados.');
        setAddOpen(false);
        fetchItems();
      }
    } else {
      // Determine group_sort: reuse existing or append
      let groupSort = 0;
      const existing = items.find((i) => i.group_name === groupName);
      if (existing) {
        groupSort = existing.group_sort;
      } else {
        groupSort = Math.max(0, ...items.map((i) => i.group_sort)) + 1;
      }
      const sortOrder =
        items.filter((i) => i.group_name === groupName).length;

      const { error } = await db.from('modifier_library').insert({
        store_id: storeId,
        name: fName.trim(),
        price,
        group_name: groupName,
        group_max: groupMax,
        is_available: fAvailable,
        group_sort: groupSort,
        sort_order: sortOrder,
      });
      if (error) {
        toast.error('Erro: ' + error.message);
      } else {
        toast.success('Item criado!');
        setAddOpen(false);
        fetchItems();
      }
    }
    setSaving(false);
  }

  async function handleDelete(it: LibraryItem) {
    if (!confirm(`Excluir "${it.name}"? Isso remove o vínculo em todos os produtos.`)) return;
    // Also delete linked product_modifiers rows first
    await db.from('product_modifiers').delete().eq('library_item_id', it.id);
    const { error } = await db.from('modifier_library').delete().eq('id', it.id);
    if (error) toast.error('Erro ao excluir');
    else {
      toast.success('Excluído');
      fetchItems();
    }
  }

  async function toggleAvailable(it: LibraryItem, checked: boolean) {
    const { error } = await db
      .from('modifier_library')
      .update({ is_available: checked })
      .eq('id', it.id);
    if (error) toast.error('Erro');
    else {
      setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, is_available: checked } : x)));
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <div>
          <CardTitle className="font-display text-xl">Adicionais (Biblioteca)</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre uma vez e aplique em vários produtos. Alterou o preço? Atualiza em todos.
          </p>
        </div>
        <Button
          size="sm"
          className="gap-2 bg-primary text-primary-foreground"
          onClick={() => openAdd()}
        >
          <Plus className="w-4 h-4" /> Novo Adicional
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhum adicional cadastrado ainda. Clique em "Novo Adicional".
          </p>
        ) : (
          <div className="space-y-6">
            {groups.map(([groupName, list]) => (
              <div key={groupName} className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <FolderPlus className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-lg">{groupName}</h3>
                    <span className="text-xs text-muted-foreground">
                      ({list.length} {list.length === 1 ? 'item' : 'itens'})
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openAdd(groupName)}>
                      <Plus className="w-3 h-3 mr-1" /> Item
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setApplyGroup(groupName)}>
                      <PackageCheck className="w-3 h-3 mr-1" /> Aplicar em produtos
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {list.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center justify-between p-3 glass-card"
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${!it.is_available ? 'line-through text-muted-foreground' : ''}`}>
                          {it.name}
                        </p>
                        <p className="text-sm">
                          {Number(it.price) > 0 ? (
                            <span className="text-primary font-semibold">
                              + R$ {Number(it.price).toFixed(2).replace('.', ',')}
                            </span>
                          ) : (
                            <span className="text-emerald font-medium">Grátis</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={it.is_available}
                          onCheckedChange={(c) => toggleAvailable(it, c)}
                        />
                        <Button size="icon" variant="ghost" onClick={() => openEdit(it)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleDelete(it)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add/Edit dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Adicional' : 'Novo Adicional'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Grupo</Label>
              <Select value={fGroup} onValueChange={setFGroup}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from(new Set([
                    ...existingGroupNames,
                    'Acompanhamentos',
                    'Cremes',
                    'Frutas',
                    'Inclusos (Grátis)',
                  ])).map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={fNewGroup}
                onChange={(e) => setFNewGroup(e.target.value)}
                placeholder="Ou digite um novo grupo"
                className="mt-2"
              />
            </div>
            <div>
              <Label>Nome</Label>
              <Input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Ex: Granola" />
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-secondary/50">
              <Label htmlFor="free-switch">Grátis (incluso)</Label>
              <Switch id="free-switch" checked={fFree} onCheckedChange={setFFree} />
            </div>
            {!fFree && (
              <div>
                <Label>Preço (R$)</Label>
                <Input value={fPrice} onChange={(e) => setFPrice(e.target.value)} placeholder="3,00" />
              </div>
            )}
            <div>
              <Label>Máx. seleções no grupo (opcional)</Label>
              <Input
                value={fMax}
                onChange={(e) => setFMax(e.target.value)}
                placeholder="Ex: 3"
                type="number"
              />
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-secondary/50">
              <Label>Disponível</Label>
              <Switch checked={fAvailable} onCheckedChange={setFAvailable} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply to products dialog */}
      <ApplyToProductsDialog
        open={!!applyGroup}
        onClose={() => setApplyGroup(null)}
        groupName={applyGroup || ''}
        storeId={storeId}
        products={products}
      />
    </Card>
  );
}

function ApplyToProductsDialog({
  open,
  onClose,
  groupName,
  storeId,
  products,
}: {
  open: boolean;
  onClose: () => void;
  groupName: string;
  storeId: string;
  products: ProductLite[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [linkedProducts, setLinkedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !groupName) return;
    (async () => {
      setLoading(true);
      // Find products already linked to this group via library
      const { data } = await db
        .from('product_modifiers')
        .select('product_id, modifier_library!inner(group_name, store_id)')
        .eq('modifier_library.store_id', storeId)
        .eq('modifier_library.group_name', groupName);
      const linked = new Set<string>((data || []).map((r: any) => r.product_id));
      setLinkedProducts(linked);
      setSelected(new Set(linked));
      setLoading(false);
    })();
  }, [open, groupName, storeId]);

  async function apply() {
    setApplying(true);
    // Products to add (in selected but not linked)
    const toAdd = Array.from(selected).filter((id) => !linkedProducts.has(id));
    // Products to remove (in linked but not selected)
    const toRemove = Array.from(linkedProducts).filter((id) => !selected.has(id));
    try {
      for (const pid of toAdd) {
        const { error } = await db.rpc('apply_library_group_to_product', {
          p_product_id: pid,
          p_group_name: groupName,
        });
        if (error) throw error;
      }
      for (const pid of toRemove) {
        const { error } = await db.rpc('remove_library_group_from_product', {
          p_product_id: pid,
          p_group_name: groupName,
        });
        if (error) throw error;
      }
      toast.success(`Aplicado em ${toAdd.length} produto(s), removido de ${toRemove.length}`);
      onClose();
    } catch (e: any) {
      toast.error('Erro: ' + (e?.message || 'falha'));
    }
    setApplying(false);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aplicar "{groupName}" em produtos</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Marque os produtos onde esse grupo de adicionais deve aparecer no cardápio.
        </p>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-1 max-h-[50vh] overflow-y-auto">
            {products.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-3 p-2 rounded hover:bg-secondary/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  onChange={() => toggle(p.id)}
                  className="w-4 h-4"
                />
                <span>{p.name}</span>
              </label>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={apply} disabled={applying}>
            {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
