import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Eye, UserPlus, TrendingUp, Loader2, MessageCircle, Store } from 'lucide-react';

type EventRow = { event_name: string; session_id: string; utm_source: string | null; utm_campaign: string | null };
export function MarketingAnalyticsTab() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data, error } = await (supabase as any).from('sales_funnel_events')
      .select('event_name,session_id,utm_source,utm_campaign')
      .gte('created_at', since).limit(5000);
    if (error) console.error(error);
    setEvents((data ?? []) as EventRow[]);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);
  const count = (name: string) => events.filter(e => e.event_name === name).length;
  const sessions = new Set(events.filter(e => e.event_name === 'PageView').map(e => e.session_id)).size;
  const leads = count('Lead');
  const contacts = count('Contact');
  const registrations = count('CompleteRegistration');
  const viewContents = count('ViewContent');
  const leadSessions = new Set(events.filter(e => e.event_name === 'Lead').map(e => e.session_id)).size;
  const leadRate = sessions ? (leadSessions / sessions) * 100 : 0;
  const sources = Array.from(events.filter(event => event.event_name === 'Lead').reduce((map, event) => {
    const key = event.utm_campaign || event.utm_source || 'Acesso direto';
    map.set(key, (map.get(key) || 0) + 1);
    return map;
  }, new Map<string, number>()).entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  return <div className="space-y-6">
    <div className="flex items-center justify-between"><div><h2 className="text-xl font-semibold">Marketing e rastreamento</h2><p className="text-sm text-muted-foreground">Eventos registrados nos últimos 30 dias.</p></div><Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4"/>Atualizar</Button></div>
    {loading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin"/></div> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardDescription className="flex gap-2"><Eye className="h-4 w-4"/>PageView</CardDescription><CardTitle className="text-3xl">{count('PageView')}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription className="flex gap-2"><TrendingUp className="h-4 w-4"/>Sessões únicas</CardDescription><CardTitle className="text-3xl">{sessions}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription className="flex gap-2"><Eye className="h-4 w-4"/>Visualizações da oferta</CardDescription><CardTitle className="text-3xl">{viewContents}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription className="flex gap-2"><UserPlus className="h-4 w-4"/>Leads enviados</CardDescription><CardTitle className="text-3xl">{leads}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription className="flex gap-2"><MessageCircle className="h-4 w-4"/>Cliques no WhatsApp</CardDescription><CardTitle className="text-3xl">{contacts}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription className="flex gap-2"><Store className="h-4 w-4"/>Lojas criadas</CardDescription><CardTitle className="text-3xl">{registrations}</CardTitle></CardHeader></Card>
      </div>
      <Card><CardHeader><CardTitle>Conversão de visita em lead</CardTitle><CardDescription>Percentual de sessões com PageView que também enviaram o formulário.</CardDescription></CardHeader><CardContent><p className="text-3xl font-semibold">{leadRate.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</p><p className="mt-1 text-xs text-muted-foreground">Sessões com Lead ÷ sessões com PageView.</p></CardContent></Card>
      <Card><CardHeader><CardTitle>Campanhas e origens</CardTitle><CardDescription>Leads agrupados por campanha UTM ou origem identificada.</CardDescription></CardHeader><CardContent>
        {sources.length ? sources.map(([name, total]) => <div key={name} className="flex justify-between border-b py-3 last:border-0"><span className="text-sm">{name}</span><Badge variant="outline">{total} leads</Badge></div>) : <p className="py-6 text-sm text-muted-foreground">Nenhum lead atribuído a campanhas ainda.</p>}
      </CardContent></Card>
      <p className="text-xs text-muted-foreground">O custo por lead e o custo por aquisição exigem também os dados de investimento das campanhas. Esta tela mostra eventos observados pelo site. ViewContent = visualização da oferta; Contact = clique para WhatsApp; CompleteRegistration = criação efetiva da loja.</p>
    </>}
  </div>;
}
