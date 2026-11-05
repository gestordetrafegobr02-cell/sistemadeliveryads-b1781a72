import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ClipboardList, Clock3, LayoutDashboard, MessageCircle, PackageCheck, ShoppingBag, Store, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useGlobalSettings } from '@/hooks/useGlobalSettings';
import { supabase } from '@/integrations/supabase/client';
import { loadLandingPixel, trackLandingEvent } from '@/lib/landingPixel';
import { useEffect } from 'react';

const segments = ['Hamburgueria', 'Pizzaria', 'Açaiteria', 'Restaurante', 'Lanchonete', 'Outro'];

const benefits = [
  { icon: Store, title: 'Sua loja com sua marca', description: 'Um cardápio online com a identidade visual do seu estabelecimento.' },
  { icon: ClipboardList, title: 'Pedidos organizados', description: 'Acompanhe os pedidos e gerencie a operação pelo painel.' },
  { icon: PackageCheck, title: 'Acompanhamento do pedido', description: 'Seu cliente recebe um link para acompanhar o andamento da compra.' },
  { icon: LayoutDashboard, title: 'Gestão em um só lugar', description: 'Organize produtos, categorias e pedidos em uma única plataforma.' },
];

const steps = [
  { number: '01', title: 'Você preenche o cadastro', description: 'Conte um pouco sobre seu negócio e deixe seu WhatsApp.' },
  { number: '02', title: 'Nossa equipe entra em contato', description: 'Entendemos sua operação e explicamos os próximos passos.' },
  { number: '03', title: 'Montamos sua loja com você', description: 'Orientamos a configuração do cardápio e da identidade da loja.' },
  { number: '04', title: 'Sua loja fica pronta para começar', description: 'Você confere tudo e se prepara para receber pedidos online.' },
];

export default function Index() {
  const { toast } = useToast();
  const { settings } = useGlobalSettings();
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [segment, setSegment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (settings.landing_pixel_id) loadLandingPixel(settings.landing_pixel_id);
  }, [settings.landing_pixel_id]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const digits = whatsapp.replace(/\D/g, '');
    if (name.trim().length < 2 || digits.length < 10 || businessName.trim().length < 2 || !segment) {
      toast({ title: 'Confira os dados', description: 'Preencha todos os campos para solicitar o contato.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('sales_leads').insert({
        name: name.trim(),
        whatsapp: digits,
        business_name: businessName.trim(),
        segment,
        source: 'landing_page',
        status: 'new',
      });
      if (error) throw error;
      trackLandingEvent('Lead', { content_name: 'assisted_onboarding_lead', segment });
      setSubmitted(true);
      toast({ title: 'Cadastro recebido!', description: 'Seus dados foram enviados para nossa equipe.' });
    } catch (error) {
      console.error('[Landing] lead submission failed', error);
      toast({ title: 'Não foi possível enviar seu cadastro', description: 'Tente novamente em instantes ou fale com nossa equipe pelo WhatsApp.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const whatsappLink = settings.owner_whatsapp
    ? `https://wa.me/${settings.owner_whatsapp.replace(/\D/g, '')}`
    : '';

  return (
    <main className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <a href="#inicio" className="flex items-center gap-2.5" aria-label="DeliveryPro início">
            <img src="/logo.png?v=5" alt="" className="h-9 w-9 rounded-xl object-contain" />
            <span className="text-xl font-bold tracking-tight">Delivery<span className="text-primary">Pro</span></span>
          </a>
          <div className="flex items-center gap-3">
            <a href="#como-funciona" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline">Como funciona</a>
            <Link to="/auth" className="text-sm font-semibold text-muted-foreground hover:text-foreground">Entrar</Link>
            <a href="#cadastro"><Button size="sm" className="rounded-xl">Quero minha loja <ArrowRight className="ml-1 h-4 w-4" /></Button></a>
          </div>
        </div>
      </nav>

      <section id="inicio" className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_20%,hsl(var(--primary)/0.16),transparent_48%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" /> Sua operação de delivery em um só lugar
            </span>
            <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Seu delivery merece ter <span className="text-primary">uma loja própria.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Receba pedidos em uma loja online com a sua marca, organize sua operação e ofereça aos clientes uma experiência de compra simples.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#cadastro"><Button size="lg" className="h-13 rounded-xl px-7 text-base">Quero criar minha loja <ArrowRight className="ml-2 h-5 w-5" /></Button></a>
              <a href="#demonstracao"><Button size="lg" variant="outline" className="h-13 rounded-xl px-7 text-base">Conhecer o sistema</Button></a>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Implantação orientada</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Sua marca em destaque</span>
            </div>
          </div>
          <div id="demonstracao" className="relative">
            <div className="absolute -inset-5 rounded-[2rem] bg-primary/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-3 shadow-2xl">
              <img src="/logo.png?v=5" alt="DeliveryPro" className="mx-auto my-4 h-12 w-12 object-contain" />
              <div className="rounded-2xl bg-secondary p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div><p className="text-xs text-muted-foreground">Painel de pedidos</p><p className="text-lg font-bold">Visão da operação</p></div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Ao vivo no painel</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-card p-4"><ShoppingBag className="mb-3 h-5 w-5 text-primary" /><p className="text-xs text-muted-foreground">Pedidos</p><p className="text-xl font-bold">Organizados</p></div>
                  <div className="rounded-xl bg-card p-4"><Clock3 className="mb-3 h-5 w-5 text-primary" /><p className="text-xs text-muted-foreground">Acompanhamento</p><p className="text-xl font-bold">Por etapas</p></div>
                  <div className="col-span-2 rounded-xl bg-card p-4"><div className="flex items-center gap-3"><Store className="h-8 w-8 rounded-lg bg-primary/10 p-1.5 text-primary" /><div><p className="font-semibold">Sua loja online</p><p className="text-sm text-muted-foreground">Cardápio, carrinho e finalização do pedido</p></div><CheckCircle2 className="ml-auto h-5 w-5 text-primary" /></div></div>
                </div>
              </div>
              <p className="py-4 text-center text-xs text-muted-foreground">Prévia ilustrativa dos recursos do DeliveryPro</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-secondary/35 px-5 py-16 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">Mais organização para sua rotina</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Tudo para colocar seu delivery em movimento</h2>
            <p className="mt-4 text-muted-foreground">Uma experiência de compra prática para seus clientes e ferramentas de gestão para sua equipe.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map(({ icon: Icon, title, description }) => <article key={title} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-6 w-6" /></div>
              <h3 className="text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </article>)}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="px-5 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">Implantação acompanhada</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Você não precisa configurar tudo sozinho.</h2>
            <p className="mt-4 text-muted-foreground">Nossa equipe orienta os primeiros passos para sua loja começar do jeito certo.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(step => <article key={step.number} className="relative rounded-2xl border border-border p-6">
              <span className="text-3xl font-black text-primary/35">{step.number}</span>
              <h3 className="mt-5 text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </article>)}
          </div>
        </div>
      </section>

      <section className="bg-primary px-5 py-16 text-primary-foreground md:py-20">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-7 md:flex-row md:items-center">
          <div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-widest opacity-80">Do primeiro contato à loja no ar</p><h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">Comece com orientação em cada etapa.</h2><p className="mt-4 max-w-xl opacity-90">Conte sobre seu estabelecimento. Nossa equipe conversa com você para entender o que precisa.</p></div>
          <a href="#cadastro"><Button size="lg" variant="secondary" className="h-13 shrink-0 rounded-xl px-7 text-base">Solicitar contato <ArrowRight className="ml-2 h-5 w-5" /></Button></a>
        </div>
      </section>

      <section id="cadastro" className="px-5 py-16 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-primary">Vamos conversar?</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Solicite a criação da sua loja.</h2>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">Preencha seus dados. Nossa equipe entrará em contato pelo WhatsApp para entender seu negócio e explicar como funciona a implantação.</p>
            <div className="mt-8 space-y-4">
              <p className="flex items-center gap-3 text-sm text-muted-foreground"><MessageCircle className="h-5 w-5 text-primary" /> Atendimento para entender sua necessidade</p>
              <p className="flex items-center gap-3 text-sm text-muted-foreground"><Truck className="h-5 w-5 text-primary" /> Orientação para preparar sua loja</p>
              <p className="flex items-center gap-3 text-sm text-muted-foreground"><CheckCircle2 className="h-5 w-5 text-primary" /> Sem criar uma loja automaticamente pelo formulário</p>
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-9">
            {submitted ? <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
              <h3 className="mt-5 text-2xl font-bold">Cadastro recebido!</h3>
              <p className="mx-auto mt-3 max-w-sm text-muted-foreground">Seus dados foram registrados. Nossa equipe poderá entrar em contato pelo WhatsApp informado.</p>
              {whatsappLink && <a href={whatsappLink} target="_blank" rel="noreferrer"><Button className="mt-6 rounded-xl"><MessageCircle className="mr-2 h-4 w-4" /> Falar com a equipe agora</Button></a>}
              <button onClick={() => { setSubmitted(false); setName(''); setWhatsapp(''); setBusinessName(''); setSegment(''); }} className="mt-4 block w-full text-sm text-muted-foreground underline">Enviar outro cadastro</button>
            </div> : <form onSubmit={handleSubmit} className="space-y-5">
              <div><h3 className="text-2xl font-bold">Quero conhecer o DeliveryPro</h3><p className="mt-1 text-sm text-muted-foreground">Leva menos de um minuto.</p></div>
              <div className="space-y-2"><Label htmlFor="lead-name">Seu nome</Label><Input id="lead-name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Como podemos chamar você?" maxLength={120} required /></div>
              <div className="space-y-2"><Label htmlFor="lead-whatsapp">WhatsApp com DDD</Label><Input id="lead-whatsapp" autoComplete="tel" inputMode="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" maxLength={20} required /></div>
              <div className="space-y-2"><Label htmlFor="lead-business">Nome do estabelecimento</Label><Input id="lead-business" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Ex.: Hamburgueria do João" maxLength={160} required /></div>
              <div className="space-y-2"><Label htmlFor="lead-segment">Tipo de negócio</Label><select id="lead-segment" value={segment} onChange={e => setSegment(e.target.value)} required className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Selecione seu segmento</option>{segments.map(item => <option key={item} value={item}>{item}</option>)}</select></div>
              <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl text-base">{loading ? 'Enviando cadastro...' : 'Solicitar contato da equipe'} <ArrowRight className="ml-2 h-5 w-5" /></Button>
              <p className="text-center text-xs leading-relaxed text-muted-foreground">Ao enviar, você autoriza o contato da equipe do DeliveryPro pelo WhatsApp informado para tratar desta solicitação.</p>
            </form>}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-secondary/30 px-5 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-2"><img src="/logo.png?v=5" alt="" className="h-8 w-8 object-contain" /><span className="font-bold">DeliveryPro</span></div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} DeliveryPro. Todos os direitos reservados.</p>
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">Acesso do cliente</Link>
        </div>
      </section>
    </main>
  );
}
