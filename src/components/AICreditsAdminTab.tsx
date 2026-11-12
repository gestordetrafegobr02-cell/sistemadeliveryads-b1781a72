import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Coins, RefreshCw, Save, PlusCircle, Wallet, TrendingUp, CircleDollarSign } from 'lucide-react';

type StoreWallet = {
  store_id: string; store_name: string; owner_id: string;
  monthly_allowance: number; monthly_used: number; monthly_remaining: number;
  extra_credits: number; credits_sold: number; revenue_brl: number;
};
type UsageRow = {
  store_id: string | null; store_name: string | null; model: string; function_name: string;
  calls: number; prompt_tokens: number; completion_tokens: number; total_tokens: number;
};
type Pricing = { model: string; provider: string; input_usd_per_million: number; output_usd_per_million: number };
type Dashboard = {
  stores: StoreWallet[]; usage: UsageRow[]; revenue_total_brl: number;
  pricing: Pricing[]; whatsapp: string | null; usd_brl: string | null;
};
const money = (v: number) => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const num = (v: number) => Number(v || 0).toLocaleString('pt-BR');

export function AICreditsAdminTab() {
  const [data,setData] = useState<Dashboard | null>(null);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [selectedStore,setSelectedStore] = useState('');
  const [credits,setCredits] = useState('10');
  const [received,setReceived] = useState('');
  const [note,setNote] = useState('');
  const [whatsapp,setWhatsapp] = useState('');
  const [usdBrl,setUsdBrl] = useState('5.80');
  const [pricing,setPricing] = useState<Pricing[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const {data: result,error} = await (supabase as any).rpc('admin_get_ai_financials');
      if(error) throw error;
      const parsed = result as Dashboard;
      setData(parsed);
      setWhatsapp(parsed.whatsapp || '');
      setUsdBrl(parsed.usd_brl || '5.80');
      setPricing(parsed.pricing || []);
      if(!selectedStore && parsed.stores?.length) setSelectedStore(parsed.stores[0].store_id);
    } catch(e:any) { toast.error(e?.message || 'Não foi possível carregar os dados de IA.'); }
    finally { setLoading(false); }
  },[selectedStore]);

  useEffect(()=>{ void refresh(); },[refresh]);

  const costSummary = useMemo(()=>{
    const map = new Map((pricing || []).map(p=>[p.model,p]));
    let totalUsd = 0, configured = true;
    for(const row of data?.usage || []) {
      const p = map.get(row.model);
      if(!p || (Number(p.input_usd_per_million)===0 && Number(p.output_usd_per_million)===0)) { configured=false; continue; }
      totalUsd += (row.prompt_tokens * Number(p.input_usd_per_million) + row.completion_tokens * Number(p.output_usd_per_million))/1_000_000;
    }
    const fx = Number(String(usdBrl).replace(',','.')) || 0;
    return {usd:totalUsd,brl:totalUsd*fx,configured,fx};
  },[data,pricing,usdBrl]);

  const grant = async () => {
    const amount = Number(credits);
    const payment = Number(received.replace(',','.')) || 0;
    if(!selectedStore || !Number.isInteger(amount) || amount<1 || amount>10000) { toast.error('Selecione uma loja e informe uma quantidade válida.'); return; }
    setSaving(true);
    try {
      const {error} = await (supabase as any).rpc('grant_ai_credits_master',{
        p_store_id:selectedStore,p_credits:amount,p_amount_received_brl:payment,p_note:note.trim() || 'Créditos extras adicionados manualmente'
      });
      if(error) throw error;
      toast.success(amount+' créditos adicionados à loja.');
      setReceived('');setNote('');
      await refresh();
    } catch(e:any) { toast.error(e?.message || 'Não foi possível adicionar os créditos.'); }
    finally { setSaving(false); }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const fx = Number(usdBrl.replace(',','.'));
      if(!Number.isFinite(fx) || fx<=0) throw new Error('Informe uma cotação válida do dólar.');
      for(const [key,value] of [['ai_credits_whatsapp',whatsapp.replace(/\\D/g,'')],['ai_usd_brl',String(fx)]] as const) {
        const {error} = await (supabase as any).rpc('admin_save_ai_setting',{p_key:key,p_value:value});
        if(error) throw error;
      }
      toast.success('Configurações salvas.');
      await refresh();
    } catch(e:any) { toast.error(e?.message || 'Erro ao salvar configurações.'); }
    finally { setSaving(false); }
  };

  const savePricing = async (item:Pricing) => {
    setSaving(true);
    try {
      const {error} = await (supabase as any).rpc('admin_upsert_ai_model_pricing',{
        p_model:item.model,p_provider:item.provider,
        p_input:Number(item.input_usd_per_million),p_output:Number(item.output_usd_per_million)
      });
      if(error) throw error;
      toast.success('Tarifa do modelo salva.');
      await refresh();
    } catch(e:any) { toast.error(e?.message || 'Não foi possível salvar a tarifa.'); }
    finally { setSaving(false); }
  };

  if(loading && !data) return <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin"/></div>;
  const stores=data?.stores || [];
  const usage=data?.usage || [];
  const revenue=Number(data?.revenue_total_brl || 0);
  const estimatedCost=costSummary.brl;
  const margin=revenue-estimatedCost;

  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card><CardHeader className="pb-2"><CardDescription>Receita com créditos extras</CardDescription><CardTitle className="text-2xl">{money(revenue)}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Pagamentos registrados manualmente no Admin Master.</CardContent></Card>
      <Card><CardHeader className="pb-2"><CardDescription>Custo estimado das APIs</CardDescription><CardTitle className="text-2xl">{costSummary.configured ? money(estimatedCost) : 'Tarifas pendentes'}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">{costSummary.configured ? 'Estimativa baseada nos tokens registrados e nas tarifas configuradas.' : 'Cadastre as tarifas dos modelos abaixo para calcular o custo.'}</CardContent></Card>
      <Card><CardHeader className="pb-2"><CardDescription>Diferença estimada</CardDescription><CardTitle className="text-2xl">{costSummary.configured ? money(margin) : '—'}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Receita de créditos extras menos custo estimado de IA. Não inclui outros custos da plataforma.</CardContent></Card>
      <Card><CardHeader className="pb-2"><CardDescription>Chamadas registradas</CardDescription><CardTitle className="text-2xl">{num(usage.reduce((s,r)=>s+Number(r.calls),0))}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">{num(usage.reduce((s,r)=>s+Number(r.total_tokens),0))} tokens de entrada e saída somados.</CardContent></Card>
    </div>

    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5"/> Carteiras das lojas</CardTitle><CardDescription>Franquia de 20 análises por mês e créditos extras administrados por você.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-end"><Button variant="outline" size="sm" onClick={()=>void refresh()} className="gap-2"><RefreshCw className="h-4 w-4"/>Atualizar</Button></div>
        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Loja</TableHead><TableHead>Franquia usada</TableHead><TableHead>Restantes</TableHead><TableHead>Extras</TableHead><TableHead>Créditos vendidos</TableHead><TableHead>Recebido</TableHead></TableRow></TableHeader><TableBody>
          {stores.map(s=><TableRow key={s.store_id}><TableCell className="font-medium">{s.store_name}</TableCell><TableCell>{num(s.monthly_used)} / {num(s.monthly_allowance)}</TableCell><TableCell>{num(s.monthly_remaining)}</TableCell><TableCell><Badge variant={s.extra_credits>0?'default':'secondary'}>{num(s.extra_credits)}</Badge></TableCell><TableCell>{num(s.credits_sold)}</TableCell><TableCell>{money(Number(s.revenue_brl))}</TableCell></TableRow>)}
          {!stores.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhuma loja encontrada.</TableCell></TableRow>}
        </TableBody></Table></div>
      </CardContent>
    </Card>

    <div className="grid gap-6 xl:grid-cols-2">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><PlusCircle className="h-5 w-5"/>Adicionar créditos extras</CardTitle><CardDescription>Confirme o pagamento recebido e credite a carteira da loja escolhida.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1"><Label>Loja</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={selectedStore} onChange={e=>setSelectedStore(e.target.value)}><option value="">Selecione uma loja</option>{stores.map(s=><option key={s.store_id} value={s.store_id}>{s.store_name}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Créditos</Label><Input type="number" min="1" max="10000" value={credits} onChange={e=>setCredits(e.target.value)}/></div><div className="space-y-1"><Label>Valor recebido (R$)</Label><Input inputMode="decimal" placeholder="Ex.: 29,90" value={received} onChange={e=>setReceived(e.target.value)}/></div></div>
          <div className="space-y-1"><Label>Observação (opcional)</Label><Input placeholder="Ex.: Pacote de 10 créditos — Pix" value={note} onChange={e=>setNote(e.target.value)}/></div>
          <Button className="w-full" onClick={()=>void grant()} disabled={saving || !selectedStore}><Coins className="mr-2 h-4 w-4"/>Adicionar créditos à loja</Button>
          <p className="text-xs text-muted-foreground">O saldo só é alterado após você confirmar o pagamento e clicar no botão.</p>
        </CardContent>
      </Card>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><CircleDollarSign className="h-5 w-5"/>Configurações financeiras</CardTitle><CardDescription>Contato para pedidos de créditos e cotação usada para converter custos de API para reais.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1"><Label>WhatsApp comercial do sistema (com DDI e DDD)</Label><Input placeholder="5511999999999" value={whatsapp} onChange={e=>setWhatsapp(e.target.value)}/></div>
          <div className="space-y-1"><Label>Cotação do dólar (R$ por US$ 1)</Label><Input inputMode="decimal" value={usdBrl} onChange={e=>setUsdBrl(e.target.value)}/></div>
          <Button variant="outline" onClick={()=>void saveSettings()} disabled={saving} className="w-full"><Save className="mr-2 h-4 w-4"/>Salvar configurações</Button>
        </CardContent>
      </Card>
    </div>

    <Card><CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5"/>Consumo por modelo e ferramenta</CardTitle><CardDescription>Dados acumulados de chamadas bem-sucedidas registradas no banco. O custo depende das tarifas cadastradas abaixo.</CardDescription></CardHeader>
      <CardContent><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Loja</TableHead><TableHead>Ferramenta</TableHead><TableHead>Modelo</TableHead><TableHead>Chamadas</TableHead><TableHead>Tokens entrada</TableHead><TableHead>Tokens saída</TableHead></TableRow></TableHeader><TableBody>
        {usage.map((u,i)=><TableRow key={i}><TableCell>{u.store_name || '—'}</TableCell><TableCell>{u.function_name}</TableCell><TableCell>{u.model}</TableCell><TableCell>{num(u.calls)}</TableCell><TableCell>{num(u.prompt_tokens)}</TableCell><TableCell>{num(u.completion_tokens)}</TableCell></TableRow>)}
        {!usage.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Ainda não há uso registrado.</TableCell></TableRow>}
      </TableBody></Table></div></CardContent>
    </Card>

    <Card><CardHeader><CardTitle>Tarifas dos modelos de IA</CardTitle><CardDescription>Informe o preço em dólares por 1 milhão de tokens. Use a tarifa vigente no painel oficial de cada provedor; modelos sem tarifa configurada não entram no custo estimado.</CardDescription></CardHeader>
      <CardContent className="space-y-3">
        {['gpt-6-luna','gemini-3.8-flash','gemini-3.7-flash','gemini-3.6-flash','gemini-3.5-flash-lite','gemini-3.5-flash'].map(model=>{
          const existing=pricing.find(p=>p.model===model);
          const item=existing || {model,provider:model.startsWith('gpt')?'OpenAI':'Gemini',input_usd_per_million:0,output_usd_per_million:0};
          return <PricingEditor key={model} item={item} onSave={savePricing} saving={saving}/>;
        })}
      </CardContent>
    </Card>
    <p className="text-xs text-muted-foreground">A estimativa usa tokens registrados e tarifas informadas por você. Ela não consulta diretamente a fatura da OpenAI ou do Google e pode não incluir imagem, cache, áudio, impostos, créditos promocionais ou diferenças de faturamento.</p>
  </div>;
}

function PricingEditor({item,onSave,saving}:{item:Pricing;onSave:(p:Pricing)=>Promise<void>;saving:boolean}) {
  const [input,setInput]=useState(String(item.input_usd_per_million || 0));
  const [output,setOutput]=useState(String(item.output_usd_per_million || 0));
  useEffect(()=>{setInput(String(item.input_usd_per_million || 0));setOutput(String(item.output_usd_per_million || 0));},[item.input_usd_per_million,item.output_usd_per_million]);
  return <div className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-end">
    <div><p className="font-medium text-sm">{item.model}</p><p className="text-xs text-muted-foreground">{item.provider}</p></div>
    <div className="space-y-1"><Label className="text-xs">Entrada (US$/1M)</Label><Input inputMode="decimal" value={input} onChange={e=>setInput(e.target.value)}/></div>
    <div className="space-y-1"><Label className="text-xs">Saída (US$/1M)</Label><Input inputMode="decimal" value={output} onChange={e=>setOutput(e.target.value)}/></div>
    <Button size="sm" variant="outline" disabled={saving} onClick={()=>void onSave({...item,input_usd_per_million:Number(input.replace(',','.')),output_usd_per_million:Number(output.replace(',','.'))})}>Salvar tarifa</Button>
  </div>;
}
