import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, MessageCircle, RefreshCw, Users, UserRoundSearch } from 'lucide-react';
import { toast } from 'sonner';

type Lead = {
  id: string; name: string; whatsapp: string; business_name: string; segment: string;
  source: string; status: string; created_at: string; utm_source: string | null;
  utm_medium: string | null; utm_campaign: string | null; contacted_at: string | null;
};
type Draft = {
  id: string; name: string | null; whatsapp: string | null; business_name: string | null;
  segment: string | null; last_seen_at: string; utm_source: string | null; utm_campaign: string | null;
};
const statuses = [
  { value: 'new', label: 'Novo' }, { value: 'contacted', label: 'Contatado' },
  { value: 'qualified', label: 'Interessado' }, { value: 'onboarding', label: 'Em implantação' },
  { value: 'converted', label: 'Convertido' }, { value: 'lost', label: 'Perdido' },
];
const statusLabel = (value: string) => statuses.find(s => s.value === value)?.label ?? value;

export function LeadsManagementTab() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [leadResult, draftResult] = await Promise.all([
      supabase.from('sales_leads').select('id,name,whatsapp,business_name,segment,source,status,created_at,utm_source,utm_medium,utm_campaign,contacted_at').order('created_at', { ascending: false }).limit(500),
      supabase.from('sales_lead_drafts').select('id,name,whatsapp,business_name,segment,last_seen_at,utm_source,utm_campaign').is('converted_lead_id', null).order('last_seen_at', { ascending: false }).limit(300),
    ]);
    if (leadResult.error) toast.error('Não foi possível carregar os leads: ' + leadResult.error.message);
    if (draftResult.error) toast.error('Não foi possível carregar os formulários incompletos: ' + draftResult.error.message);
    setLeads((leadResult.data ?? []) as Lead[]);
    setDrafts((draftResult.data ?? []) as Draft[]);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => leads.filter(lead => {
    const text = [lead.name, lead.whatsapp, lead.business_name, lead.segment, lead.utm_campaign].join(' ').toLowerCase();
    return (filter === 'all' || lead.status === filter) && text.includes(search.toLowerCase());
  }), [leads, filter, search]);

  async function updateStatus(lead: Lead, status: string) {
    setSavingId(lead.id);
    const { error } = await supabase.from('sales_leads').update({
      status, updated_at: new Date().toISOString(),
      contacted_at: status === 'contacted' && !lead.contacted_at ? new Date().toISOString() : lead.contacted_at,
    }).eq('id', lead.id);
    if (error) toast.error('Não foi possível atualizar o lead: ' + error.message);
    else { setLeads(old => old.map(item => item.id === lead.id ? { ...item, status, contacted_at: status === 'contacted' ? item.contacted_at ?? new Date().toISOString() : item.contacted_at } : item)); toast.success('Lead atualizado.'); }
    setSavingId(null);
  }

  function openWhatsApp(phone: string, name: string, business: string) {
    const digits = (phone || '').replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) { toast.error('O WhatsApp deste cadastro parece inválido.'); return; }
    const message = `Olá ${name || 'tudo bem'}! Aqui é da equipe DeliveryPro. Recebemos seu interesse para a loja ${business || ''} e estou entrando em contato para ajudar. Podemos conversar?`;
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }

  const newCount = leads.filter(l => l.status === 'new').length;
  const convertedCount = leads.filter(l => l.status === 'converted').length;

  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-3">
      <Card><CardHeader className="pb-2"><CardDescription>Cadastros recebidos</CardDescription><CardTitle className="text-3xl">{leads.length}</CardTitle></CardHeader></Card>
      <Card><CardHeader className="pb-2"><CardDescription>Aguardando contato</CardDescription><CardTitle className="text-3xl">{newCount}</CardTitle></CardHeader></Card>
      <Card><CardHeader className="pb-2"><CardDescription>Convertidos</CardDescription><CardTitle className="text-3xl">{convertedCount}</CardTitle></CardHeader></Card>
    </div>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/> Leads comerciais</CardTitle><CardDescription>Cadastros enviados pelo formulário da página de vendas.</CardDescription></div>
        <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4"/> Atualizar</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1"><UserRoundSearch className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input className="pl-9" placeholder="Buscar nome, WhatsApp, loja ou campanha" value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <Select value={filter} onValueChange={setFilter}><SelectTrigger className="sm:w-52"><SelectValue placeholder="Filtrar situação"/></SelectTrigger><SelectContent><SelectItem value="all">Todas as situações</SelectItem>{statuses.map(s=><SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select>
        </div>
        {loading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin"/></div> : filtered.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhum cadastro encontrado.</p> :
          <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Contato</TableHead><TableHead>Estabelecimento</TableHead><TableHead>Origem / campanha</TableHead><TableHead>Data</TableHead><TableHead>Situação</TableHead><TableHead>Ação</TableHead></TableRow></TableHeader><TableBody>
            {filtered.map(lead=><TableRow key={lead.id}>
              <TableCell><div className="font-medium">{lead.name}</div><div className="text-xs text-muted-foreground">{lead.whatsapp}</div></TableCell>
              <TableCell><div>{lead.business_name}</div><div className="text-xs text-muted-foreground">{lead.segment}</div></TableCell>
              <TableCell><div className="text-sm">{lead.utm_source || lead.source || 'Direto'}</div><div className="text-xs text-muted-foreground">{lead.utm_campaign || lead.utm_medium || 'Sem campanha identificada'}</div></TableCell>
              <TableCell className="whitespace-nowrap text-sm">{new Date(lead.created_at).toLocaleString('pt-BR')}</TableCell>
              <TableCell><Select value={lead.status} onValueChange={v=>void updateStatus(lead,v)} disabled={savingId===lead.id}><SelectTrigger className="w-40"><SelectValue/></SelectTrigger><SelectContent>{statuses.map(s=><SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></TableCell>
              <TableCell><Button size="sm" onClick={()=>openWhatsApp(lead.whatsapp,lead.name,lead.business_name)}><MessageCircle className="mr-2 h-4 w-4"/> WhatsApp</Button></TableCell>
            </TableRow>)}
          </TableBody></Table></div>}
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Formulários iniciados e não concluídos</CardTitle><CardDescription>Somente visitantes que autorizaram expressamente salvar o progresso para possível retorno da equipe.</CardDescription></CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin"/></div> : drafts.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Ainda não há formulários incompletos com consentimento.</p> :
          <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Dados disponíveis</TableHead><TableHead>Campanha</TableHead><TableHead>Última atividade</TableHead><TableHead>Ação</TableHead></TableRow></TableHeader><TableBody>
            {drafts.map(d=><TableRow key={d.id}><TableCell><div className="font-medium">{d.name || 'Nome não informado'}</div><div className="text-xs text-muted-foreground">{d.whatsapp || 'WhatsApp não informado'}</div><div className="text-xs">{d.business_name || 'Estabelecimento não informado'} {d.segment ? '• '+d.segment : ''}</div></TableCell><TableCell className="text-sm">{d.utm_campaign || d.utm_source || 'Acesso direto'}</TableCell><TableCell className="whitespace-nowrap text-sm">{new Date(d.last_seen_at).toLocaleString('pt-BR')}</TableCell><TableCell>{d.whatsapp ? <Button size="sm" variant="outline" onClick={()=>openWhatsApp(d.whatsapp!,d.name || '',d.business_name || '')}><MessageCircle className="mr-2 h-4 w-4"/> WhatsApp</Button> : <Badge variant="secondary">Sem telefone</Badge>}</TableCell></TableRow>)}
          </TableBody></Table></div>}
      </CardContent>
    </Card>
  </div>;
}
