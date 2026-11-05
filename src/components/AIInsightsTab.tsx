import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Utensils, TrendingUp, Lightbulb, CalendarDays, Loader2, Check, RefreshCw, Clock3, AlertCircle } from 'lucide-react';

type Action = 'menu' | 'combos' | 'sales' | 'forecast';
type Usage = { hourly_limit: number; used_last_hour: number; remaining_last_hour: number; used_this_month: number; prompt_tokens: number; completion_tokens: number; total_tokens: number; period: string };
type Props = { storeId: string; products: { id: string; name: string; description: string | null }[]; onApplied: () => void };
const tools: { id: Action; label: string; title: string; description: string; icon: typeof Sparkles }[] = [
  { id: 'menu', label: 'Cardápio', title: 'Cardápio inteligente', description: 'Compare as descrições atuais com as melhorias propostas antes de aprovar qualquer alteração.', icon: Utensils },
  { id: 'combos', label: 'Combos', title: 'Combos e oportunidades', description: 'Combinações sugeridas a partir dos produtos que aparecem juntos nos pedidos.', icon: Lightbulb },
  { id: 'sales', label: 'Vendas', title: 'Consultor de vendas', description: 'Leitura dos resultados, destaques e oportunidades observadas no histórico.', icon: TrendingUp },
  { id: 'forecast', label: 'Demanda', title: 'Previsão de demanda', description: 'Estimativa orientativa por dia da semana, baseada nos pedidos registrados.', icon: CalendarDays },
];

const number = (value: unknown) => Number(value ?? 0).toLocaleString('pt-BR');
const tokenCount = (value: unknown) => number(value);

export function AIInsightsTab({ storeId, products, onApplied }: Props) {
  const [action, setAction] = useState<Action>('menu');
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [payload, setPayload] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const run = async () => {
    setLoading(true); setPayload(null); setErrorMessage('');
    try {
      const { data, error } = await supabase.functions.invoke('ai-business-insights', { body: { store_id: storeId, action } });
      if (error) {
        let message = error.message ?? 'Não foi possível concluir a análise.';
        try {
          const response = error.context;
          if (response && typeof response.json === 'function') {
            const details = await response.json();
            if (typeof details?.error === 'string' && details.error.trim()) message = details.error;
          }
        } catch { /* Keep the original client error. */ }
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);
      setPayload(data);
    } catch (error: any) {
      const message = error?.message ?? 'Não foi possível concluir a análise.';
      setErrorMessage(message.includes('alta demanda') || message.includes('sobrecarregado') || message.includes('temporariamente')
        ? 'A IA está um pouco sobrecarregada neste momento. Seus dados continuam seguros e a análise ainda não foi concluída. Aguarde um pouquinho e tente novamente.'
        : message);
    } finally { setLoading(false); }
  };

  const applyDescriptions = async () => {
    const suggestions = Array.isArray(payload?.result?.suggestions) ? payload.result.suggestions : [];
    const valid = suggestions.filter((s: any) => products.some(p => p.id === s.product_id) && typeof s.suggested_description === 'string' && s.suggested_description.trim());
    if (!valid.length) return;
    setApplying(true);
    try {
      for (const suggestion of valid) {
        const { error } = await supabase.from('products').update({ description: suggestion.suggested_description.trim().slice(0, 500) }).eq('id', suggestion.product_id).eq('store_id', storeId);
        if (error) throw error;
      }
      setPayload(null);
      onApplied();
      setErrorMessage('');
    } catch (error: any) { setErrorMessage(error?.message ?? 'Não foi possível salvar as descrições.'); }
    finally { setApplying(false); }
  };

  const selected = tools.find(t => t.id === action)!;
  const result = payload?.result;
  const usage: Usage | undefined = payload?.usage;
  const menuSuggestions = Array.isArray(result?.suggestions) ? result.suggestions : [];

  return <div className="space-y-4">
    <Card className="border-primary/20 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Central de inteligência artificial</CardTitle>
        <CardDescription>Ferramentas conectadas ao Gemini. Você confere as recomendações antes de aplicar mudanças no cardápio.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={action} onValueChange={v => { setAction(v as Action); setPayload(null); setErrorMessage(''); }}>
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
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> A IA está analisando — aguarde um instante...</> : <><Sparkles className="h-4 w-4" /> {payload ? 'Atualizar análise' : 'Executar análise'}</>}
        </Button>
        {loading && <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm" role="status" aria-live="polite">
          <div className="flex items-center gap-2 font-medium"><Loader2 className="h-4 w-4 animate-spin" /> Estamos trabalhando na sua análise.</div>
          <p className="mt-1 text-muted-foreground">Estamos consultando os dados da loja e aguardando o processamento da IA. Isso pode levar alguns instantes. Não feche esta tela; você verá o resultado aqui.</p>
        </div>}
        {errorMessage && <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm" role="alert">
          <div className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="font-medium">Não foi possível concluir agora</p><p className="mt-1 text-muted-foreground">{errorMessage}</p><Button variant="outline" size="sm" className="mt-3 gap-2" onClick={run} disabled={loading}><RefreshCw className="h-3.5 w-3.5" /> Tentar novamente</Button></div></div>
        </div>}
        {payload && result && <div className="space-y-4 rounded-xl border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><Badge variant="secondary">Gemini • {payload.model}</Badge><span className="text-xs text-muted-foreground">{number(payload.sample?.orders)} pedidos • {number(payload.sample?.products)} produtos analisados</span></div>
          <p className="font-medium">{result.summary ?? 'Análise concluída.'}</p>
          {payload.analysis && <details className="rounded-lg border border-border p-3" open>
            <summary className="cursor-pointer font-semibold">O que a IA analisou</summary>
            <div className="mt-3 space-y-2 text-sm">
              <p><strong>Base:</strong> {number(payload.sample?.products)} produtos, {number(payload.sample?.categories)} categorias e {number(payload.sample?.orders)} pedidos válidos.</p>
              {payload.analysis.date_from && <p><strong>Período dos pedidos:</strong> {new Date(payload.analysis.date_from).toLocaleDateString('pt-BR')} até {new Date(payload.analysis.date_to).toLocaleDateString('pt-BR')}.</p>}
              {Array.isArray(payload.analysis.products) && <div><p className="mb-1 font-medium">Produtos considerados</p><div className="flex flex-wrap gap-1">{payload.analysis.products.map((p: any) => <Badge key={p.id} variant="outline">{p.name}</Badge>)}</div></div>}
              {Array.isArray(payload.analysis.co_occurrences) && payload.analysis.co_occurrences.length > 0 && <div><p className="mb-1 font-medium">Produtos que apareceram juntos nos pedidos</p>{payload.analysis.co_occurrences.map((pair: any, i: number) => <p key={i} className="text-muted-foreground">{pair.product_names.join(' + ')} — {pair.orders} {pair.orders === 1 ? 'pedido' : 'pedidos'}</p>)}</div>}
            </div>
          </details>
          {action === 'menu' && <div className="space-y-3">
            {menuSuggestions.length === 0 && <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">A IA não encontrou descrições que precisem de melhoria com os dados disponíveis. Nenhuma alteração foi feita.</p>}
            {menuSuggestions.map((s: any, i: number) => <div key={s.product_id ?? i} className="rounded-lg border border-border p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{s.name || products.find(p => p.id === s.product_id)?.name || 'Produto'}</p><Badge variant="outline">Sugestão {i + 1}</Badge></div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg bg-muted/50 p-3"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Como está hoje</p><p className="text-sm">{s.current_description?.trim() || 'Este produto ainda não possui descrição.'}</p></div>
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">Como a IA sugere</p><p className="text-sm">{s.suggested_description}</p></div>
              </div>
              {s.reason && <p className="mt-3 text-xs text-muted-foreground"><strong>Por que sugeriu:</strong> {s.reason}</p>}
            </div>)}
            {menuSuggestions.length > 0 && <div className="space-y-2"><p className="text-xs text-muted-foreground">Nada será alterado até você aprovar. A aprovação abaixo aplica somente as descrições exibidas.</p><Button onClick={applyDescriptions} disabled={applying} className="gap-2">{applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Aprovar e aplicar {menuSuggestions.length} {menuSuggestions.length === 1 ? 'alteração' : 'alterações'}</Button></div>}
          </div>}
          {action === 'combos' && <div className="space-y-3">
            {(result.suggestions ?? []).length === 0 && (payload.analysis?.co_occurrences ?? []).length === 0 && <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">Ainda não há evidências suficientes de produtos comprados juntos. A IA não vai inventar combinações.</p>}
            {(result.suggestions ?? []).map((s: any, i: number) => <div key={i} className="rounded-lg border border-border p-3"><p className="font-semibold">{s.name || `Sugestão de combo ${i + 1}`}</p><p className="mt-2 text-sm">{(s.product_names ?? []).join(' + ')}</p><p className="mt-2 text-sm text-muted-foreground">{s.reason}</p>{s.evidence && <p className="mt-1 text-xs text-muted-foreground">Evidência: {s.evidence}</p>}</div>)}
            {(result.suggestions ?? []).length === 0 && (payload.analysis?.co_occurrences ?? []).length > 0 && <div className="space-y-2"><p className="font-medium">Combinações encontradas nos pedidos</p>{payload.analysis.co_occurrences.map((pair: any, i: number) => <div key={i} className="rounded-lg border border-border p-3"><p className="font-medium">{pair.product_names.join(' + ')}</p><p className="text-xs text-muted-foreground">Apareceram juntos em {pair.orders} pedidos. Evidência observada, não previsão de vendas.</p></div>)}</div>}
            <p className="text-xs text-muted-foreground">Estas são ideias para avaliação. A IA não cria combos nem altera preços automaticamente.</p>
          </div>}
          {action === 'sales' && <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2"><h4 className="font-semibold">O que os dados mostram</h4>{(result.highlights ?? []).map((item: any, i: number) => <div key={i} className="rounded-lg bg-muted/40 p-3 text-sm"><p className="font-medium">{item.title}</p><p className="mt-1 text-muted-foreground">{item.detail}</p><p className="mt-1 text-xs">Evidência: {item.evidence}</p></div>)}</div>
            <div className="space-y-2"><h4 className="font-semibold">Oportunidades</h4>{(result.opportunities ?? []).map((item: any, i: number) => <div key={i} className="rounded-lg border border-border p-3 text-sm"><p className="font-medium">{item.title}</p><p className="mt-1">{item.action}</p><p className="mt-1 text-xs text-muted-foreground">Base: {item.evidence}</p></div>)}</div>
          </div>}
          {action === 'forecast' && <div className="space-y-2">{(result.forecast ?? []).map((item: any, i: number) => <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 p-3 text-sm"><div><p className="font-semibold">{item.weekday}</p><p className="text-xs text-muted-foreground">{item.basis}</p></div><div className="text-right"><p className="font-semibold">{number(item.expected_orders)} pedidos estimados</p><p className="text-xs text-muted-foreground">Faixa: {number(item.range_low)}–{number(item.range_high)}</p></div></div>)}</div>}
          {Array.isArray(result.notes) && result.notes.length > 0 && <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm"><p className="mb-1 font-semibold">Limitações e observações</p><ul className="list-disc space-y-1 pl-5">{result.notes.map((n: string, i: number) => <li key={i}>{n}</li>)}</ul></div>}
          <p className="text-xs text-muted-foreground">As estimativas são orientativas e dependem da qualidade e quantidade do histórico. Nenhuma alteração é feita automaticamente.</p>
        </div>}
      </CardContent>
    </Card>
    {usage && <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock3 className="h-4 w-4" /> Uso de IA desta loja</CardTitle><CardDescription>O consumo é separado por loja e não é compartilhado com outras lojas da plataforma.</CardDescription></CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Última hora</p><p className="text-lg font-semibold">{number(usage.used_last_hour)} / {number(usage.hourly_limit)}</p><p className="text-xs text-muted-foreground">{number(usage.remaining_last_hour)} análises disponíveis</p></div>
        <div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Análises no mês</p><p className="text-lg font-semibold">{number(usage.used_this_month)}</p><p className="text-xs text-muted-foreground">Desde {usage.period}</p></div>
        <div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Tokens enviados</p><p className="text-lg font-semibold">{tokenCount(usage.prompt_tokens)}</p><p className="text-xs text-muted-foreground">Dados e instruções enviados à IA</p></div>
        <div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Tokens recebidos</p><p className="text-lg font-semibold">{tokenCount(usage.completion_tokens)}</p><p className="text-xs text-muted-foreground">Respostas geradas pela IA</p></div>
      </CardContent>
    </Card>}
  </div>;
}
