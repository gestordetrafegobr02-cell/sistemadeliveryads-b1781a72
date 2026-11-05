import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Sparkles, TrendingUp, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UsageLog {
  id: string; function_name: string; model: string | null; store_id: string | null;
  prompt_tokens: number; completion_tokens: number; total_tokens: number;
  success: boolean; error_message: string | null; created_at: string;
}
interface StoreInfo { id: string; name: string }

export function AIUsageTab() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLogs = async () => {
    setLoading(true); setError('');
    const [usageRes, storesRes] = await Promise.all([
      supabase.from('ai_usage_logs').select('id,function_name,model,store_id,prompt_tokens,completion_tokens,total_tokens,success,error_message,created_at').order('created_at', { ascending: false }).limit(1000),
      supabase.from('stores').select('id,name').limit(1000),
    ]);
    if (usageRes.error || storesRes.error) {
      setError('Não foi possível carregar o consumo de IA. Verifique as permissões de leitura do Master Admin.');
      setLoading(false); return;
    }
    setLogs((usageRes.data as UsageLog[]) ?? []);
    setStores((storesRes.data as StoreInfo[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    const channel = supabase.channel('ai_usage_logs_master')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_usage_logs' }, () => { fetchLogs(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const month = logs.filter(l => l.created_at >= monthStart);
    const day = logs.filter(l => l.created_at >= dayStart);
    const sum = (items: UsageLog[], field: 'prompt_tokens' | 'completion_tokens' | 'total_tokens') => items.reduce((n, l) => n + Number(l[field] ?? 0), 0);
    return {
      monthCalls: month.length, dayCalls: day.length,
      success: month.filter(l => l.success).length, errors: month.filter(l => !l.success).length,
      prompt: sum(month, 'prompt_tokens'), completion: sum(month, 'completion_tokens'), total: sum(month, 'total_tokens'),
    };
  }, [logs]);

  const byStore = useMemo(() => {
    const names = new Map(stores.map(s => [s.id, s.name]));
    const grouped = new Map<string, UsageLog[]>();
    for (const log of logs) {
      const key = log.store_id ?? 'sem-loja';
      grouped.set(key, [...(grouped.get(key) ?? []), log]);
    }
    return [...grouped.entries()].map(([id, entries]) => ({
      id, name: names.get(id) ?? (id === 'sem-loja' ? 'Sem loja vinculada' : 'Loja não encontrada'),
      calls: entries.length, successful: entries.filter(l => l.success).length,
      errors: entries.filter(l => !l.success).length,
      tokens: entries.reduce((n, l) => n + Number(l.total_tokens ?? 0), 0),
      last: entries[0]?.created_at,
    })).sort((a, b) => b.calls - a.calls);
  }, [logs, stores]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h2 className="text-xl font-semibold flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Consumo de IA por loja</h2><p className="text-sm text-muted-foreground">Medição real das chamadas Gemini registradas no banco. Não representa créditos Lovable nem estima cobrança em dinheiro.</p></div>
      <Button variant="outline" size="sm" onClick={fetchLogs} className="gap-2"><RefreshCw className="h-4 w-4" /> Atualizar</Button>
    </div>
    {error && <div className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{error}</div>}
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Card><CardHeader className="pb-2"><CardDescription>Chamadas hoje</CardDescription><CardTitle className="text-3xl">{stats.dayCalls}</CardTitle></CardHeader></Card>
      <Card><CardHeader className="pb-2"><CardDescription>Chamadas no mês</CardDescription><CardTitle className="text-3xl">{stats.monthCalls}</CardTitle></CardHeader></Card>
      <Card><CardHeader className="pb-2"><CardDescription>Concluídas</CardDescription><CardTitle className="text-3xl text-green-600">{stats.success}</CardTitle></CardHeader><CardContent><CheckCircle2 className="h-4 w-4 text-green-600" /></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardDescription>Falhas registradas</CardDescription><CardTitle className="text-3xl text-destructive">{stats.errors}</CardTitle></CardHeader><CardContent><AlertCircle className="h-4 w-4 text-destructive" /></CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>Tokens consumidos neste mês</CardTitle><CardDescription>Contagem informada pela API Gemini. Valores financeiros dependem do modelo, da tabela de preços vigente e do plano da chave.</CardDescription></CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Entrada</p><p className="text-xl font-semibold">{stats.prompt.toLocaleString('pt-BR')}</p></div>
        <div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Saída</p><p className="text-xl font-semibold">{stats.completion.toLocaleString('pt-BR')}</p></div>
        <div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-semibold">{stats.total.toLocaleString('pt-BR')}</p></div>
      </CardContent>
    </Card>
    <Card><CardHeader><CardTitle>Consumo separado por loja</CardTitle><CardDescription>Chamadas e tokens de cada estabelecimento, sem misturar os históricos.</CardDescription></CardHeader><CardContent>
      {byStore.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma análise concluída registrada ainda.</p> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Loja</TableHead><TableHead>Chamadas</TableHead><TableHead>Concluídas</TableHead><TableHead>Falhas</TableHead><TableHead className="text-right">Tokens</TableHead><TableHead>Última atividade</TableHead></TableRow></TableHeader><TableBody>
        {byStore.map(store => <TableRow key={store.id}><TableCell className="font-medium">{store.name}</TableCell><TableCell>{store.calls}</TableCell><TableCell><Badge variant="outline" className="text-green-600">{store.successful}</Badge></TableCell><TableCell>{store.errors}</TableCell><TableCell className="text-right">{store.tokens.toLocaleString('pt-BR')}</TableCell><TableCell className="text-xs text-muted-foreground">{store.last ? formatDistanceToNow(new Date(store.last), { addSuffix: true, locale: ptBR }) : '—'}</TableCell></TableRow>)}
      </TableBody></Table></div>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Últimas 200 análises</CardTitle><CardDescription>Registro operacional das chamadas de IA.</CardDescription></CardHeader><CardContent>
      {logs.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma chamada registrada.</p> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Quando</TableHead><TableHead>Loja</TableHead><TableHead>Ferramenta</TableHead><TableHead>Modelo</TableHead><TableHead className="text-right">Tokens</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
        {logs.slice(0, 200).map(log => <TableRow key={log.id}><TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}</TableCell><TableCell className="text-sm">{stores.find(s => s.id === log.store_id)?.name ?? '—'}</TableCell><TableCell className="font-mono text-xs">{log.function_name}</TableCell><TableCell className="font-mono text-xs">{log.model ?? '—'}</TableCell><TableCell className="text-right text-xs">{Number(log.total_tokens ?? 0).toLocaleString('pt-BR')}</TableCell><TableCell>{log.success ? <Badge variant="outline" className="text-green-600">OK</Badge> : <Badge variant="destructive" title={log.error_message ?? ''}>Erro</Badge>}</TableCell></TableRow>)}
      </TableBody></Table></div>}
    </CardContent></Card>
  </div>;
}
