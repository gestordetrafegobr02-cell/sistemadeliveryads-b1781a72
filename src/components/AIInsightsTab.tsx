import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Utensils, TrendingUp, Lightbulb, CalendarDays, Loader2, Check, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

type Action = 'menu' | 'combos' | 'sales' | 'forecast';
type Props = { storeId: string; products: { id: string; name: string; description: string | null }[]; onApplied: () => void };
const tools: { id: Action; label: string; title: string; description: string; icon: typeof Sparkles }[] = [
  { id: 'menu', label: 'Cardápio', title: 'Cardápio inteligente', description: 'Melhorias de descrição e organização com base nos produtos cadastrados.', icon: Utensils },
  { id: 'combos', label: 'Combos', title: 'Combos e oportunidades', description: 'Combinações sugeridas a partir dos itens que aparecem juntos nos pedidos.', icon: Lightbulb },
  { id: 'sales', label: 'Vendas', title: 'Consultor de vendas', description: 'Leitura dos resultados, destaques e oportunidades observadas no histórico.', icon: TrendingUp },
  { id: 'forecast', label: 'Demanda', title: 'Previsão de demanda', description: 'Estimativa orientativa por dia da semana, baseada nos pedidos registrados.', icon: CalendarDays },
];

export function AIInsightsTab({ storeId, products, onApplied }: Props) {
  const [action, setAction] = useState<Action>('menu');
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [payload, setPayload] = useState<any>(null);

  const run = async () => {
    setLoading(true); setPayload(null);
    try {
      const { data, error } = await supabase.functions.invoke('ai-business-insights', { body: { store_id: storeId, action } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPayload(data);
    } catch (error: any) {
      toast.error(error?.message ?? 'Não foi possível executar a análise');
    } finally { setLoading(false); }
  };

  const applyDescriptions = async () => {
    const suggestions = Array.isArray(payload?.result?.suggestions) ? payload.result.suggestions : [];
    const valid = suggestions.filter((s: any) => products.some(p => p.id === s.product_id) && typeof s.suggested_description === 'string' && s.suggested_description.trim());
    if (!valid.length) return toast.error('Não há descrições válidas para aplicar.');
    setApplying(true);
    try {
      for (const suggestion of valid) {
        const product = products.find(p => p.id === suggestion.product_id);
        if (!product) continue;
        const { error } = await supabase.from('products').update({ description: suggestion.suggested_description.trim().slice(0, 500) }).eq('id', suggestion.product_id).eq('store_id', storeId);
        if (error) throw error;
      }
      toast.success(`${valid.length} descrições atualizadas após sua aprovação.`);
      onApplied();
      await run();
    } catch (error: any) { toast.error(error?.message ?? 'Falha ao salvar as descrições'); }
    finally { setApplying(false); }
  };

  const selected = tools.find(t => t.id === action)!;
  const result = payload?.result;
  const pretty = (value: unknown) => typeof value === 'string' ? value : JSON.stringify(value, null, 2);

  return <div className="space-y-4">
    <Card className="border-primary/20 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Central de inteligência artificial</CardTitle>
        <CardDescription>Quatro ferramentas conectadas ao Gemini. As análises são sugestões; nenhuma mudança é feita sem sua aprovação.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={action} onValueChange={v => { setAction(v as Action); setPayload(null); }}>
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 md:grid-cols-4">
            {tools.map(tool => <TabsTrigger key={tool.id} value={tool.id} className="gap-2"><tool.icon className="h-4 w-4" />{tool.label}</TabsTrigger>)}
          </TabsList>
          {tools.map(tool => <TabsContent key={tool.id} value={tool.id} className="pt-3">
            <div className="rounded-xl border border-border p-4">
              <h3 className="font-semibold">{tool.title}</h3><p className="mt-1 text-sm text-muted-foreground">{tool.description}</p>
            </div>
          </TabsContent>)}
        </Tabs>
        <Button onClick={run} disabled={loading || applying} className="w-full gap-2">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analisando dados da loja...</> : <><Sparkles className="h-4 w-4" /> {payload ? 'Atualizar análise' : 'Executar análise'}</>}
        </Button>
        {payload && result && <div className="space-y-4 rounded-xl border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><Badge variant="secondary">Gemini • {payload.model}</Badge><span className="text-xs text-muted-foreground">{payload.sample?.orders ?? 0} pedidos • {payload.sample?.products ?? 0} produtos</span></div>
          <p className="font-medium">{result.summary ?? 'Análise concluída.'}</p>
          {action === 'menu' && Array.isArray(result.suggestions) && <div className="space-y-3">
            {result.suggestions.map((s: any, i: number) => <div key={s.product_id ?? i} className="rounded-lg bg-muted/40 p-3 text-sm">
              <p className="font-semibold">{s.name}</p><p className="mt-2 text-muted-foreground">Atual: {s.current_description || 'Sem descrição'}</p><p className="mt-1">Sugestão: {s.suggested_description}</p><p className="mt-1 text-xs text-muted-foreground">{s.reason}</p>
            </div>)}
            {result.suggestions.length > 0 && <Button onClick={applyDescriptions} disabled={applying} className="gap-2">{applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Aprovar e aplicar descrições</Button>}
          </div>}
          {action !== 'menu' && <pre className="max-h-[460px] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted/40 p-3 text-xs leading-relaxed">{pretty(result)}</pre>}
          {Array.isArray(result.notes) && result.notes.length > 0 && <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm"><p className="mb-1 font-semibold">Limitações e observações</p><ul className="list-disc space-y-1 pl-5">{result.notes.map((n: string, i: number) => <li key={i}>{n}</li>)}</ul></div>}
          <p className="text-xs text-muted-foreground">As estimativas são orientativas e dependem da qualidade e quantidade do histórico. A IA não altera produtos, preços ou pedidos automaticamente.</p>
        </div>}
      </CardContent>
    </Card>
  </div>;
}
