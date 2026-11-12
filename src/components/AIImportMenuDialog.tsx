import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Upload, Trash2, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type ExtractedItem = {
  category: string;
  name: string;
  description: string;
  price: number;
  itemType: 'product' | 'modifier';
  modifierGroup: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  existingCategories: { id: string; name: string }[];
  onImported: () => void;
};

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AIImportMenuDialog({ open, onOpenChange, storeId, existingCategories, onImported }: Props) {
  const [mode, setMode] = useState<'photo' | 'text'>('photo');
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<ExtractedItem[]>([]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    existingCategories.forEach((c) => set.add(c.name));
    items.forEach((i) => i.category && set.add(i.category));
    return Array.from(set).sort();
  }, [existingCategories, items]);

  const reset = () => {
    setFiles([]);
    setText('');
    setItems([]);
    setMode('photo');
  };

  const handleClose = (v: boolean) => {
    if (!v && !loading && !saving) reset();
    onOpenChange(v);
  };

  const runExtraction = async () => {
    if (mode === 'photo' && files.length === 0) return toast.error('Selecione pelo menos uma foto do cardápio');
    if (mode === 'text' && !text.trim()) return toast.error('Cole o texto do cardápio');

    setLoading(true);
    setItems([]);
    try {
      const payload: { images?: string[]; image?: string; text?: string; store_id: string } = { store_id: storeId };
      if (mode === 'photo' && files.length) {
        const isPdfFile = (candidate: File) => candidate.type === 'application/pdf' || candidate.name.toLowerCase().endsWith('.pdf');
        const isSupportedImage = (candidate: File) => ['image/jpeg', 'image/png', 'image/webp'].includes(candidate.type);
        if (files.length > 3) {
          toast.error('Selecione no máximo 3 fotos por importação.');
          setLoading(false);
          return;
        }
        if (files.some(isPdfFile) && files.length > 1) {
          toast.error('Para PDF, envie somente um arquivo por vez. Para três páginas separadas, envie as três como fotos.');
          setLoading(false);
          return;
        }
        if (files.some((candidate) => !isPdfFile(candidate) && !isSupportedImage(candidate))) {
          toast.error('Formato não suportado. Envie JPG, PNG, WEBP ou um PDF.');
          setLoading(false);
          return;
        }
        const isPdf = isPdfFile(files[0]);
        const maxPerFile = isPdf ? 8 * 1024 * 1024 : 2.5 * 1024 * 1024;
        if (files.some((candidate) => candidate.size > maxPerFile)) {
          toast.error(isPdf ? 'O PDF deve ter no máximo 8MB.' : 'Cada foto deve ter no máximo 2,5MB.');
          setLoading(false);
          return;
        }
        const totalBytes = files.reduce((sum, candidate) => sum + candidate.size, 0);
        if (totalBytes > (isPdf ? 8 : 7.5) * 1024 * 1024) {
          toast.error('O tamanho total das fotos deve ser de até 7,5MB.');
          setLoading(false);
          return;
        }
        const dataUrls = await Promise.all(files.map(fileToDataUrl));
        if (isPdf) payload.image = dataUrls[0];
        else payload.images = dataUrls;
      } else {
        payload.text = text.trim();
      }

      const { data, error } = await supabase.functions.invoke('ai-import-menu', { body: payload });
      if (error) {
        let message = error.message ?? 'Falha ao processar cardápio.';
        try {
          const response = error.context;
          if (response && typeof response.json === 'function') {
            const details = await response.json();
            if (typeof details?.error === 'string' && details.error.trim()) message = details.error;
          }
        } catch { /* Keep the original request error. */ }
        throw new Error(message);
      }
      const extracted = ((data?.items ?? []) as Omit<ExtractedItem, 'itemType' | 'modifierGroup'>[]).map((item) => ({
        ...item,
        itemType: 'product' as const,
        modifierGroup: 'Acompanhamentos',
      }));
      if (!extracted.length) {
        toast.error('Nenhum produto identificado. Tente outra foto ou texto mais claro.');
      } else {
        setItems(extracted);
        toast.success(`${extracted.length} produtos extraídos. Revise antes de publicar.`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao processar cardápio');
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (idx: number, patch: Partial<ExtractedItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const publish = async () => {
    if (!items.length) return;
    const valid = items.filter((i) => i.name.trim().length > 0);
    if (!valid.length) return toast.error('Nenhum produto válido');

    setSaving(true);
    try {
      // 1. Ensure categories exist
      const productItems = valid.filter((item) => item.itemType === 'product');
      const modifierItems = valid.filter((item) => item.itemType === 'modifier');
      const uniqueCats = Array.from(new Set(productItems.map((i) => i.category.trim() || 'Cardápio')));
      const nameToId = new Map(existingCategories.map((c) => [c.name.toLowerCase(), c.id]));
      const toCreate = uniqueCats.filter((n) => !nameToId.has(n.toLowerCase()));

      if (toCreate.length) {
        const { data: created, error } = await supabase
          .from('categories')
          .insert(toCreate.map((name, idx) => ({ store_id: storeId, name, sort_order: existingCategories.length + idx })))
          .select('id, name');
        if (error) throw error;
        (created ?? []).forEach((c) => nameToId.set(c.name.toLowerCase(), c.id));
      }

      // 2. Insert products
      const { data: existingModifiers, error: existingModifiersError } = await supabase
        .from('modifier_library')
        .select('name, group_name')
        .eq('store_id', storeId);
      if (existingModifiersError) throw existingModifiersError;

      const existingModifierKeys = new Set(
        (existingModifiers ?? []).map((item: { name: string; group_name: string }) =>
          `${item.group_name.toLowerCase()}::${item.name.toLowerCase()}`
        )
      );
      const groupSorts = new Map<string, number>();
      const modifierRows = modifierItems
        .filter((item) => !existingModifierKeys.has(`${(item.modifierGroup.trim() || 'Acompanhamentos').toLowerCase()}::${item.name.trim().toLowerCase()}`))
        .map((item) => {
          const groupName = item.modifierGroup.trim() || 'Acompanhamentos';
          if (!groupSorts.has(groupName)) groupSorts.set(groupName, groupSorts.size);
          return {
            store_id: storeId,
            group_name: groupName,
            name: item.name.trim(),
            price: Math.max(0, Number(item.price) || 0),
            is_available: true,
            group_min: 0,
            group_max: null,
            is_default: false,
            group_sort: groupSorts.get(groupName)!,
            sort_order: 0,
          };
        });

      if (modifierRows.length) {
        const { error: modifierErr } = await supabase.from('modifier_library').insert(modifierRows);
        if (modifierErr) throw modifierErr;
      }

      const rows = productItems.map((it, idx) => ({
        store_id: storeId,
        category_id: nameToId.get((it.category.trim() || 'Cardápio').toLowerCase())!,
        name: it.name.trim(),
        description: it.description.trim() || null,
        price: Number(it.price) || 0,
        is_available: true,
        sort_order: idx,
      }));
      if (rows.length) {
        const { error: prodErr } = await supabase.from('products').insert(rows);
        if (prodErr) throw prodErr;
      }

      toast.success(`${rows.length} produtos publicados e ${modifierRows.length} acompanhamentos adicionados à biblioteca!`);
      reset();
      onOpenChange(false);
      onImported();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao publicar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Importar cardápio com IA
          </DialogTitle>
        </DialogHeader>

        {items.length === 0 ? (
          <div className="space-y-4">
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'photo' | 'text')}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="photo" className="gap-2">
                  <Upload className="w-4 h-4" /> Foto do cardápio
                </TabsTrigger>
                <TabsTrigger value="text" className="gap-2">
                  <Wand2 className="w-4 h-4" /> Colar texto
                </TabsTrigger>
              </TabsList>

              <TabsContent value="photo" className="space-y-3 pt-4">
                <Label>Envie até 3 fotos do cardápio (JPG/PNG/WEBP, até 2,5MB cada) ou um PDF de até 8MB</Label>
                <Input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
                  onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                />
                {files.length > 0 && (
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {files.map((selectedFile) => (
                      <div key={`${selectedFile.name}-${selectedFile.lastModified}`}>
                        Selecionado: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(0)}KB)
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Você pode selecionar as três fotos de uma vez. A IA analisa as imagens em conjunto e identifica nome, descrição, preço e categoria. Para PDF, envie um arquivo por vez. Revise tudo antes de publicar.
                </p>
              </TabsContent>

              <TabsContent value="text" className="space-y-3 pt-4">
                <Label>Cole a lista de produtos (WhatsApp, bloco de notas, etc.)</Label>
                <Textarea
                  rows={10}
                  placeholder={`Ex:\n\nHambúrgueres\nX-Burger - Pão, hambúrguer, queijo e alface - R$ 18,00\nX-Bacon - Com bacon crocante - R$ 22,00\n\nBebidas\nCoca-Cola 350ml - R$ 6,00\nÁgua - R$ 3,00`}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </TabsContent>
            </Tabs>

            <Button onClick={runExtraction} disabled={loading} className="w-full gap-2">
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analisando com IA...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Extrair produtos</>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <strong>{items.length}</strong> itens identificados. Classifique cada um como produto ou acompanhamento antes de publicar.
              </p>
              <Button variant="ghost" size="sm" onClick={reset} disabled={saving}>
                Recomeçar
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-[110px_1fr_1fr_1.5fr_90px_40px] gap-2 p-2 bg-muted text-xs font-semibold">
                <div>Tipo</div>
                <div>Categoria / Grupo</div>
                <div>Nome</div>
                <div>Descrição</div>
                <div>Preço (R$)</div>
                <div></div>
              </div>
              <div className="max-h-[50vh] overflow-y-auto divide-y">
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-[110px_1fr_1fr_1.5fr_90px_40px] gap-2 p-2 items-center">
                    <select
                      value={it.itemType}
                      onChange={(e) => updateItem(idx, { itemType: e.target.value as 'product' | 'modifier' })}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="product">Produto</option>
                      <option value="modifier">Acompanhamento</option>
                    </select>
                    {it.itemType === 'product' ? (
                      <>
                        <Input
                          list={`ai-cats-${idx}`}
                          value={it.category}
                          onChange={(e) => updateItem(idx, { category: e.target.value })}
                          className="h-8 text-sm"
                        />
                        <datalist id={`ai-cats-${idx}`}>
                          {categoryOptions.map((c) => <option key={c} value={c} />)}
                        </datalist>
                      </>
                    ) : (
                      <Input
                        value={it.modifierGroup}
                        onChange={(e) => updateItem(idx, { modifierGroup: e.target.value })}
                        placeholder="Acompanhamentos"
                        className="h-8 text-sm"
                      />
                    )}
                    <Input
                      value={it.name}
                      onChange={(e) => updateItem(idx, { name: e.target.value })}
                      className="h-8 text-sm"
                    />
                    <Input
                      value={it.description}
                      onChange={(e) => updateItem(idx, { description: e.target.value })}
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={it.price}
                      onChange={(e) => updateItem(idx, { price: Number(e.target.value) })}
                      className="h-8 text-sm"
                    />
                    <Button size="icon" variant="ghost" onClick={() => removeItem(idx)} disabled={saving}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={publish} disabled={saving} className="gap-2">
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Publicando...</>
                ) : (
                  <>Publicar {items.filter((item) => item.itemType === 'product').length} produtos e {items.filter((item) => item.itemType === 'modifier').length} acompanhamentos</>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
