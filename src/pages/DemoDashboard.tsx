import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, BarChart3, Bell, CheckCircle2, ChevronRight, Clock3,
  ClipboardList, Flame, LayoutDashboard, Package, Plus, Search,
  Settings, ShoppingBag, Store, Tag, Users, Utensils, Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type Tab = 'overview' | 'orders' | 'products' | 'categories' | 'reports' | 'radar' | 'store' | 'team';

const orders = [
  { id: '#1048', customer: 'Mariana Costa', items: '2x Smash Burger + 1x Fritas', total: 'R$ 58,80', status: 'Novo pedido', tone: 'amber', time: 'Há 2 min' },
  { id: '#1047', customer: 'Rafael Souza', items: '1x Burger Pro + 1x Refrigerante', total: 'R$ 42,90', status: 'Em preparação', tone: 'blue', time: 'Há 12 min' },
  { id: '#1046', customer: 'Camila Oliveira', items: '1x Combo Família', total: 'R$ 79,90', status: 'Saiu para entrega', tone: 'violet', time: 'Há 25 min' },
  { id: '#1045', customer: 'Pedro Lima', items: '2x X-Bacon', total: 'R$ 63,80', status: 'Concluído', tone: 'green', time: 'Há 41 min' },
];

const products = [
  { name: 'Smash Burger', category: 'Hambúrgueres', price: 'R$ 29,90', stock: 'Disponível' },
  { name: 'Burger Pro', category: 'Hambúrgueres', price: 'R$ 36,90', stock: 'Disponível' },
  { name: 'Batata Frita', category: 'Acompanhamentos', price: 'R$ 14,90', stock: 'Disponível' },
  { name: 'Combo Família', category: 'Combos', price: 'R$ 79,90', stock: 'Disponível' },
];

const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'orders', label: 'Pedidos', icon: ClipboardList },
  { id: 'products', label: 'Produtos', icon: Package },
  { id: 'categories', label: 'Categorias', icon: Tag },
  { id: 'reports', label: 'Relatórios', icon: BarChart3 },
  { id: 'radar', label: 'Radar', icon: Flame },
  { id: 'store', label: 'Minha loja', icon: Store },
  { id: 'team', label: 'Equipe', icon: Users },
];

function Metric({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof ShoppingBag }) {
  return <div className="rounded-2xl border border-border bg-card p-4 sm:p-5"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{label}</span><Icon className="h-5 w-5 text-primary" /></div><p className="mt-3 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></div>;
}

export default function DemoDashboard() {
  const [active, setActive] = useState<Tab>('overview');
  const [search, setSearch] = useState('');
  const [showDemoNote, setShowDemoNote] = useState(true);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-primary/20 bg-primary/10 px-4 py-2 text-center text-xs font-medium text-primary">
        Demonstração interativa • Hamburgueria do João • Dados fictícios, sem conexão com lojas ou pedidos reais
      </div>
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" aria-label="Voltar à página inicial" className="rounded-lg p-2 hover:bg-secondary"><ArrowLeft className="h-4 w-4" /></Link>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Store className="h-5 w-5" /></div>
            <div><p className="font-bold leading-tight">Hamburgueria do João</p><p className="text-xs text-muted-foreground">Painel do lojista • DeliveryPro</p></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 sm:inline-flex">● Loja aberta</span>
            <Button size="sm" variant="outline" asChild><Link to="/#cadastro">Quero minha loja</Link></Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] md:grid-cols-[220px_1fr]">
        <aside className="border-b border-border p-3 md:min-h-[calc(100vh-105px)] md:border-b-0 md:border-r md:p-4">
          <p className="mb-3 hidden px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground md:block">Menu principal</p>
          <nav className="flex gap-1 overflow-x-auto md:flex-col">
            {tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setActive(id)} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors md:w-full ${active === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}><Icon className="h-4 w-4" />{label}</button>)}
          </nav>
          <div className="mt-8 hidden rounded-2xl bg-secondary p-4 md:block"><p className="text-xs font-semibold">Sua loja online</p><p className="mt-1 break-all text-xs text-muted-foreground">deliverypro.app/ hamburgueria-do-joao</p><Button className="mt-3 w-full" size="sm" variant="outline" onClick={() => setActive('store')}>Ver configurações</Button></div>
        </aside>

        <main className="min-w-0 p-4 sm:p-6 lg:p-8">
          {showDemoNote && <div className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm"><p><strong>Você está explorando uma loja de exemplo.</strong> Os botões e dados desta demonstração não alteram o sistema real.</p><button onClick={() => setShowDemoNote(false)} className="text-xs font-semibold text-primary">Entendi</button></div>}
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div><p className="text-sm text-muted-foreground">Quarta-feira • Visão de demonstração</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">{tabs.find(t => t.id === active)?.label}</h1><p className="mt-1 text-sm text-muted-foreground">Acompanhe e organize a operação da sua loja.</p></div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground"><Bell className="h-3.5 w-3.5" /> Ambiente demonstrativo</span>
          </div>

          {active === 'overview' && <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Pedidos hoje" value="28" note="+12% em relação a ontem" icon={ShoppingBag} />
              <Metric label="Vendas do dia" value="R$ 1.248,50" note="Valor ilustrativo" icon={Wallet} />
              <Metric label="Em andamento" value="5" note="Pedidos para acompanhar" icon={Clock3} />
              <Metric label="Ticket médio" value="R$ 44,59" note="Média ilustrativa" icon={BarChart3} />
            </div>
            <section className="rounded-2xl border border-border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4"><div><h2 className="font-bold">Pedidos recentes</h2><p className="text-xs text-muted-foreground">Veja os pedidos e seus respectivos status</p></div><Button size="sm" variant="outline" onClick={() => setActive('orders')}>Ver todos <ChevronRight className="ml-1 h-4 w-4" /></Button></div>
              <OrderList />
            </section>
            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-5"><h2 className="font-bold">Atalhos da operação</h2><div className="mt-4 grid grid-cols-2 gap-3">{[{ label: 'Gerenciar produtos', tab: 'products' as Tab, icon: Package }, { label: 'Ver pedidos', tab: 'orders' as Tab, icon: ClipboardList }, { label: 'Configurar loja', tab: 'store' as Tab, icon: Settings }, { label: 'Relatórios', tab: 'reports' as Tab, icon: BarChart3 }].map(({label,tab,icon:Icon}) => <button key={tab} onClick={() => setActive(tab)} className="flex items-center gap-2 rounded-xl bg-secondary p-3 text-left text-sm font-medium hover:bg-secondary/70"><Icon className="h-4 w-4 text-primary" />{label}</button>)}</div></div>
              <div className="rounded-2xl border border-border bg-card p-5"><h2 className="font-bold">Sua loja está aberta</h2><p className="mt-2 text-sm text-muted-foreground">Os clientes podem acessar o cardápio online e enviar pedidos.</p><div className="mt-4 flex items-center gap-2 text-sm font-semibold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Recebendo pedidos</div><Button className="mt-4" variant="outline" size="sm" onClick={() => setActive('store')}>Ver dados da loja</Button></div>
            </section>
          </div>}

          {active === 'orders' && <section className="rounded-2xl border border-border bg-card"><div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold">Gerenciamento de pedidos</h2><p className="text-xs text-muted-foreground">Pedidos fictícios para demonstrar o painel</p></div><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar pedido ou cliente" className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm sm:w-64" /></div></div><OrderList filter={search} /></section>}

          {active === 'products' && <section className="rounded-2xl border border-border bg-card"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4"><div><h2 className="font-bold">Produtos do cardápio</h2><p className="text-xs text-muted-foreground">Exemplo de cadastro e organização de produtos</p></div><Button size="sm" onClick={() => setShowDemoNote(true)}><Plus className="mr-1 h-4 w-4" /> Novo produto (demo)</Button></div><div className="divide-y divide-border">{products.map(p=><div key={p.name} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-semibold">{p.name}</p><p className="text-xs text-muted-foreground">{p.category}</p></div><div className="flex items-center gap-4"><span className="text-sm font-bold">{p.price}</span><span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-600">{p.stock}</span></div></div>)}</div></section>}

          {active === 'categories' && <section className="rounded-2xl border border-border bg-card"><div className="border-b border-border p-4"><h2 className="font-bold">Categorias do cardápio</h2><p className="text-xs text-muted-foreground">Organize os produtos para facilitar a navegação dos clientes.</p></div><div className="grid gap-3 p-4 sm:grid-cols-2">{['Hambúrgueres • 8 produtos','Combos • 4 produtos','Acompanhamentos • 5 produtos','Bebidas • 9 produtos'].map(item=><div key={item} className="flex items-center gap-3 rounded-xl bg-secondary p-4"><Tag className="h-5 w-5 text-primary" /><span className="text-sm font-medium">{item}</span></div>)}</div></section>}

          {active === 'reports' && <div className="grid gap-4 sm:grid-cols-2"><Metric label="Faturamento ilustrativo" value="R$ 8.420,00" note="Últimos 30 dias" icon={Wallet} /><Metric label="Pedidos concluídos" value="186" note="Últimos 30 dias" icon={ShoppingBag} /><Metric label="Ticket médio" value="R$ 45,27" note="Últimos 30 dias" icon={BarChart3} /><Metric label="Produtos cadastrados" value="26" note="No cardápio de exemplo" icon={Package} /></div>}

          {active === 'radar' && <section className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-3"><div className="rounded-xl bg-orange-500/10 p-3 text-orange-600"><Flame className="h-5 w-5" /></div><div><h2 className="font-bold">Radar de carrinhos</h2><p className="text-xs text-muted-foreground">Exemplo de acompanhamento de oportunidades</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><Metric label="Carrinhos identificados" value="12" note="Dados fictícios" icon={ShoppingBag} /><Metric label="Aguardando retorno" value="7" note="Exemplo" icon={Clock3} /><Metric label="Recuperados" value="5" note="Exemplo" icon={CheckCircle2} /></div><p className="mt-4 text-sm text-muted-foreground">Nesta área o lojista pode acompanhar carrinhos abandonados e as oportunidades de recuperação disponíveis no sistema.</p></section>}

          {active === 'store' && <section className="rounded-2xl border border-border bg-card p-5"><h2 className="font-bold">Cadastro da loja</h2><p className="mt-1 text-sm text-muted-foreground">Exemplo de como os dados do estabelecimento aparecem nas configurações.</p><div className="mt-5 grid gap-4 sm:grid-cols-2">{[['Nome da loja','Hamburgueria do João'],['Endereço da loja online','deliverypro.app/hamburgueria-do-joao'],['WhatsApp','(77) 99999-0000 (fictício)'],['Taxa de entrega','R$ 5,00'],['Chave PIX','joao@exemplo.com (fictícia)'],['Horário de funcionamento','Ter a Dom • 18h às 23h']].map(([label,value])=><div key={label} className="rounded-xl bg-secondary p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm font-semibold">{value}</p></div>)}</div><div className="mt-5 rounded-xl border border-dashed border-border p-4"><p className="text-sm font-semibold">Personalização da loja</p><p className="mt-1 text-sm text-muted-foreground">Logo, capa, cores, funcionamento e informações de contato.</p></div></section>}

          {active === 'team' && <section className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-primary" /><div><h2 className="font-bold">Equipe da loja</h2><p className="text-xs text-muted-foreground">Exemplo de perfis de acesso</p></div></div><div className="mt-5 divide-y divide-border">{[['João Silva','Proprietário'],['Ana Souza','Gerente'],['Carlos Lima','Atendente'],['Marcos Alves','Cozinha']].map(([name,role])=><div key={name} className="flex items-center justify-between py-3"><span className="font-medium">{name}</span><span className="rounded-full bg-secondary px-3 py-1 text-xs">{role}</span></div>)}</div></section>}

          <div className="mt-8 flex flex-col items-center justify-between gap-3 rounded-2xl bg-primary p-5 text-primary-foreground sm:flex-row"><div><p className="text-lg font-bold">Gostou do que viu?</p><p className="text-sm opacity-90">Tenha um painel como este na sua própria loja.</p></div><Button asChild variant="secondary"><Link to="/#cadastro">Solicitar minha loja <ChevronRight className="ml-1 h-4 w-4" /></Link></Button></div>
          <p className="mt-6 text-center text-xs text-muted-foreground">Demonstração ilustrativa do painel do lojista. Não representa dados de uma loja real.</p>
        </main>
      </div>
    </div>
  );
}

function OrderList({ filter = '' }: { filter?: string }) {
  const filtered = orders.filter(o => `${o.id} ${o.customer} ${o.items}`.toLowerCase().includes(filter.toLowerCase()));
  const tone: Record<string,string> = { amber:'bg-amber-500/10 text-amber-700', blue:'bg-blue-500/10 text-blue-700', violet:'bg-violet-500/10 text-violet-700', green:'bg-emerald-500/10 text-emerald-700' };
  return <div className="divide-y divide-border">{filtered.map(o=><div key={o.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><span className="font-bold">{o.id}</span><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone[o.tone]}`}>{o.status}</span></div><p className="mt-1 text-sm font-medium">{o.customer}</p><p className="truncate text-xs text-muted-foreground">{o.items}</p></div><div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end"><span className="font-bold">{o.total}</span><span className="text-xs text-muted-foreground">{o.time}</span></div></div>)}{filtered.length===0&&<p className="p-8 text-center text-sm text-muted-foreground">Nenhum pedido encontrado na demonstração.</p>}</div>;
}
