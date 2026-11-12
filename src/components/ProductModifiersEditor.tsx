import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layers, Loader2, Settings2, Trash2, Sparkles, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Modifier {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  is_default: boolean;
  group_name: string | null;
  group_sort?: number | null;
  sort_order?: number | null;
}

interface AiSuggestion {
  modifier_id: string;
  name: string;
  reason: string;
  confidence: 'high' | 'medium';
}

interface LibraryGroup {
  group_name: string;
  items: number;
}

interface ProductModifiersEditorProps {
  productId: string;
  productName: string;
  storeId: string;
}

const db = supabase as any;

export function ProductModifiersEditor({ productId, productName, storeId }: ProductModifiersEditorProps) {
  const [open, setOpen] = useState(false);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [libraryGroups, setLibraryGroups] = useState<LibraryGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);\n  const [analyzing, setAnalyzing] = useState(false);\n  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);\n  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) void fetchData();
  }, [open, productId, storeId]);

  async function fetchData() {
    setLoading(true);
    const [linkedResponse, libraryResponse] = await Promise.all([
      db.from('product_modifiers').select('*').eq('product_id', productId)
        .order('group_sort', { ascending: true, nullsFirst: false })
        .order('sort_order', { ascending: true }),
      db.from('modifier_library').select('group_name')
        .eq('store_id', storeId).eq('is_available', true)
        .order('group_sort', { ascending: true }),
    ]);

    if (linkedResponse.error) {
      toast.error('Não foi possível carregar os acompanhamentos do produto.');
      setModifiers([]);
    } else {
      setModifiers((linkedResponse.data || []) as Modifier[]);
    }

    if (libraryResponse.error) {
      toast.error('Não foi possível carregar os grupos da biblioteca.');
      setLibraryGroups([]);
    } else {
      const counts = new Map<string, number>();
      (libraryResponse.data || []).forEach((item: { group_name: string }) => {
        counts.set(item.group_name, (counts.get(item.group_name) || 0) + 1);
      });
      setLibraryGroups(Array.from(counts, ([group_name, items]) => ({ group_name, items })));
    }
    setLoading(false);
  }

  const linkedGroups = useMemo(
    () => Array.from(new Set(modifiers.map((item) => item.group_name?.trim()).filter((name): name is string => Boolean(name)))),
    [modifiers]
  );

  const availableGroups = libraryGroups.filter((group) => !linkedGroups.includes(group.group_name));

  async function handleAiAnalysis() {
    if (analyzing || saving) return;
    setAnalyzing(true);
    setSuggestions([]);
    setSelectedSuggestions(new Set());
    const { data, error } = await db.functions.invoke('ai-suggest-product-modifiers', {
      body: { product_id: productId, store_id: storeId },
    });
    setAnalyzing(false);
    if (error || data?.error) {
      toast.error(data?.error || 'Não foi possível analisar a composição com IA.');
      return;
    }
    const validIds = new Set(modifiers.map((item) => item.id));
    const safeSuggestions = (Array.isArray(data?.suggestions) ? data.suggestions : [])
      .filter((item: AiSuggestion) => item && validIds.has(item.modifier_id))
      .map((item: AiSuggestion) => ({
        modifier_id: item.modifier_id,
        name: String(item.name || '').slice(0, 100),
        reason: String(item.reason || '').slice(0, 240),
        confidence: item.confidence === 'high' ? 'high' as const : 'medium' as const,
      }))
      .filter((item: AiSuggestion) => !modifiers.find((m) => m.id === item.modifier_id)?.is_default);
    setSuggestions(safeSuggestions);
    setSelectedSuggestions(new Set(safeSuggestions.map((item) => item.modifier_id)));
    if (!safeSuggestions.length) toast.info('A IA não encontrou correspondências seguras entre a descrição e os acompanhamentos vinculados.');
  }

  async function applyAiSuggestions() {
    const ids = Array.from(selectedSuggestions);
    if (!ids.length || saving) return;
    setSaving(true);
    const { error } = await db.from('product_modifiers')
      .update({ is_default: true })
      .eq('product_id', productId)
      .in('id', ids);
    setSaving(false);
    if (error) {
      toast.error('Não foi possível aplicar as sugestões da IA.');
      return;
    }
    toast.success('Sugestões confirmadas e marcadas como inclusas.');
    setSuggestions([]);
    setSelectedSuggestions(new Set());
    await fetchData();
  }

  async function handleApplyGroup() {
    if (!selectedGroup || saving) return;
    setSaving(true);
    const { error } = await db.rpc('apply_library_group_to_product', {
      p_product_id: productId,
      p_group_name: selectedGroup,
    });
    if (error) {
      toast.error('Não foi possível vincular o grupo: ' + error.message);
    } else {
      toast.success('Acompanhamentos vinculados ao produto!');
      setSelectedGroup('');
      await fetchData();
    }
    setSaving(false);
  }

  async function handleRemoveGroup(groupName: string) {
    if (saving) return;
    if (!confirm(`Remover o grupo "${groupName}" deste produto?`)) return;
    setSaving(true);
    const { error } = await db.rpc('remove_library_group_from_product', {
      p_product_id: productId,
      p_group_name: groupName,
    });
    if (error) toast.error('Não foi possível remover o grupo: ' + error.message);
    else {
      toast.success('Grupo removido deste produto.');
      await fetchData();
    }
    setSaving(false);
  }

  async function handleToggleIncluded(modifier: Modifier, included: boolean) {
    const { error } = await db.from('product_modifiers')
      .update({ is_default: included })
      .eq('id', modifier.id)
      .eq('product_id', productId);
    if (error) {
      toast.error('Não foi possível atualizar o acompanhamento.');
    } else {
      setModifiers((current) => current.map((item) =>
        item.id === modifier.id ? { ...item, is_default: included } : item
      ));
    }
  }

  const groupedModifiers = useMemo(() => {
    const groups = new Map<string, Modifier[]>();
    modifiers.forEach((item) => {
      const name = item.group_name?.trim() || 'Acompanhamentos';
      groups.set(name, [...(groups.get(name) || []), item]);
    });
    return Array.from(groups.entries());
  }, [modifiers]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start gap-2">
          <Settings2 className="h-4 w-4" />
          Configurar acompanhamentos
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Acompanhamentos: {productName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
            <div>
              <p className="font-medium text-sm flex items-center gap-2"><Sparkles className="h-4 w-4" /> Identificar inclusos com IA</p>
              <p className="text-xs text-muted-foreground">A IA compara a descrição do produto com os acompanhamentos já vinculados. Nada é alterado sem sua confirmação.</p>
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={handleAiAnalysis} disabled={analyzing || loading || modifiers.length === 0}>
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {analyzing ? 'Analisando composição...' : 'Analisar composição'}
            </Button>
            {suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium">Revise as sugestões antes de aplicar:</p>
                {suggestions.map((suggestion) => (
                  <label key={suggestion.modifier_id} className="flex items-start gap-2 rounded-md bg-background p-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedSuggestions.has(suggestion.modifier_id)}
                      onChange={(event) => setSelectedSuggestions((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.add(suggestion.modifier_id);
                        else next.delete(suggestion.modifier_id);
                        return next;
                      })}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{suggestion.name}</span>
                      <span className="block text-xs text-muted-foreground">{suggestion.reason}</span>
                      <span className="block text-[10px] text-muted-foreground">Confiança {suggestion.confidence === 'high' ? 'alta' : 'média'}</span>
                    </span>
                  </label>
                ))}
                <Button type="button" className="w-full" onClick={applyAiSuggestions} disabled={saving || selectedSuggestions.size === 0}>
                  <Check className="h-4 w-4 mr-2" /> Confirmar {selectedSuggestions.size} incluso(s)
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border p-3 space-y-3">
            <div>
              <p className="font-medium text-sm">Adicionar da biblioteca</p>
              <p className="text-xs text-muted-foreground">Vincule um grupo de acompanhamentos a este produto.</p>
            </div>
            {availableGroups.length > 0 ? (
              <div className="flex gap-2">
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione um grupo" /></SelectTrigger>
                  <SelectContent>
                    {availableGroups.map((group) => (
                      <SelectItem key={group.group_name} value={group.group_name}>
                        {group.group_name} ({group.items})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={handleApplyGroup} disabled={!selectedGroup || saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
                  <span className="ml-2">Vincular</span>
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Todos os grupos disponíveis já estão vinculados. Cadastre novos itens na aba Adicionais.</p>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : groupedModifiers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum acompanhamento vinculado. Escolha um grupo da biblioteca acima.</p>
          ) : (
            <div className="space-y-4">
              {groupedModifiers.map(([groupName, items]) => (
                <section key={groupName} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm">{groupName}</h3>
                    <Button type="button" variant="ghost" size="sm" className="text-destructive h-8" onClick={() => handleRemoveGroup(groupName)} disabled={saving}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover grupo
                    </Button>
                  </div>
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-md bg-secondary/40 p-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {Number(item.price) > 0 ? `+ R$ ${Number(item.price).toFixed(2).replace('.', ',')}` : 'Grátis'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-muted-foreground">Incluso / fixo</span>
                        <Switch checked={Boolean(item.is_default)} onCheckedChange={(checked) => handleToggleIncluded(item, checked)} />
                      </div>
                    </div>
                  ))}
                </section>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            A IA apenas sugere correspondências; revise antes de confirmar. Os itens inclusos são separados dos extras no cardápio do cliente.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
