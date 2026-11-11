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
  const [file, setFile] = useState<File | null>(null);
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
    setFile(null);
    setText('');
    setItems([]);
    setMode('photo');
  };

  const handleClose = (v: boolean) => {
    if (!v && !loading && !saving) reset();
    onOpenChange(v);
  };

  const runExtraction = async () => {
    if (mode === 'photo' && !file) return toast.error('Selecione uma foto do cardápio');
    if (mode === 'text' && !text.trim()) return toast.error('Cole o texto do cardápio');

    setLoading(true);
    setItems([]);
    try {
      const payload: { image?: string; text?: string; store_id: string } = { store_id: storeId };
      if (mode === 'photo' && file) {
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const isSupportedImage = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
        if (!isPdf && !isSupportedImage) {
          toast.error('Formato não suportado. Envie JPG, PNG, WEBP ou PDF.');
          setLoading(false);
          return;
        }
        if (file.size > 8 * 1024 * 1024) {
          toast.error('Arquivo muito grande (máx 8MB)');
          setLoading(false);
          return;
        }
        payload.image = await fileToDataUrl(file);
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
      const extracted = (data?.items ?? []) as ExtractedItem[];
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
      const uniqueCats = Array.from(new Set(valid.map((i) => i.category.trim() || 'Cardápio')));
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
      const rows = valid.map((it, idx) => ({
        store_id: storeId,
        category_id: nameToId.get((it.category.trim() || 'Cardápio').toLowerCase())!,
        name: it.name.trim(),
        description: it.description.trim() || null,
        price: Number(it.price) || 0,
        is_available: true,
        sort_order: idx,
      }));
      const { error: prodErr } = await supabase.from('products').insert(rows);
      if (prodErr) throw prodErr;

      toast.success(`${rows.length} produtos publicados!`);
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
                <Label>Envie uma foto ou PDF do cardápio (JPG/PNG/WEBP/PDF, até 8MB)</Label>
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                {file && (
                  <div className="text-sm text-muted-foreground">
                    Selecionado: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(0)}KB)
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  A IA vai identificar nome, descrição, preço e categoria. Envie arquivos de até 8MB; a análise pode levar um pouco mais de tempo em cardápios extensos. Você revisa tudo antes de publicar.
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
                <strong>{items.length}</strong> produtos identificados. Revise e edite antes de publicar.
              </p>
              <Button variant="ghost" size="sm" onClick={reset} disabled={saving}>
                Recomeçar
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-[1fr_1fr_2fr_100px_40px] gap-2 p-2 bg-muted text-xs font-semibold">
                <div>Categoria</div>
                <div>Nome</div>
                <div>Descrição</div>
                <div>Preço (R$)</div>
                <div></div>
              </div>
              <div className="max-h-[50vh] overflow-y-auto divide-y">
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_2fr_100px_40px] gap-2 p-2 items-center">
                    <Input
                      list={`ai-cats-${idx}`}
                      value={it.category}
                      onChange={(e) => updateItem(idx, { category: e.target.value })}
                      className="h-8 text-sm"
                    />
                    <datalist id={`ai-cats-${idx}`}>
                      {categoryOptions.map((c) => <option key={c} value={c} />)}
                    </datalist>
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
                  <>Publicar {items.length} produtos</>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
