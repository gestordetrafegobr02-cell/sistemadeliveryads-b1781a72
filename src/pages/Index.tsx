import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGlobalSettings } from '@/hooks/useGlobalSettings';
import { loadLandingPixel, trackLandingEvent } from '@/lib/landingPixel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PricingSection } from '@/components/landing/PricingSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { ScrollReveal } from '@/components/landing/ScrollReveal';
import { Icon3D } from '@/components/landing/Icon3D';
import { WhatsAppLeadModal } from '@/components/landing/WhatsAppLeadModal';
import { motion, useScroll, useTransform } from 'framer-motion';
import { sendLeadNotification } from '@/lib/whatsappLeadNotification';
import hero3d from '@/assets/hero-3d-app.png';
import icon3dStore from '@/assets/icon-3d-store.png';
import icon3dLocation from '@/assets/icon-3d-location.png';
import icon3dWallet from '@/assets/icon-3d-wallet.png';
import icon3dDelivery from '@/assets/icon-3d-delivery.png';
import {
  Store,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  Pizza,
  Leaf,
  IceCream,
  UtensilsCrossed,
  MapPin,
  Wallet,
  Truck,
  Palette,
  Monitor,
  Infinity as InfinityIcon,
  Printer,
  Smartphone,
  Users2,
  BarChart3,
  LayoutGrid,
  MessageCircle,
} from 'lucide-react';

const NICHE_OPTIONS = [
  { slug: 'burger-shop', name: 'Hamburgueria', icon: UtensilsCrossed, color: 'from-orange-500 to-red-500', description: 'Lanchonetes e fast-food' },
  { slug: 'pizza', name: 'Pizzaria', icon: Pizza, color: 'from-red-500 to-yellow-500', description: 'Pizzas e massas' },
  { slug: 'acai-shop', name: 'Açaiteria', icon: IceCream, color: 'from-purple-500 to-pink-500', description: 'Açaí e sorvetes' },
  { slug: 'grocery', name: 'Hortifruti', icon: Leaf, color: 'from-green-500 to-emerald-500', description: 'Frutas e verduras' },
];

const HOW_STEPS = [
  { img: icon3dStore, glow: 'hsl(25 95% 53%)', title: 'Seu negócio online', description: 'O cliente adiciona os itens do menu no carrinho.' },
  { img: icon3dLocation, glow: 'hsl(210 90% 60%)', title: 'Endereço de entrega', description: 'O cliente informa o endereço ou se irá buscar o pedido.' },
  { img: icon3dWallet, glow: 'hsl(145 63% 49%)', title: 'Forma de pagamento', description: 'O cliente seleciona a forma de pagamento.' },
  { img: icon3dDelivery, glow: 'hsl(270 70% 60%)', title: 'E por fim, Delivery', description: 'O pedido chega no painel e pode ser preparado e entregue.' },
];

const FEATURES = [
  { icon: Palette, title: 'Cardápio personalizável', description: 'Customize cores, logos e layout do seu cardápio digital.' },
  { icon: LayoutGrid, title: 'PDV, retirada, delivery e mesas', description: 'Múltiplas formas de atendimento em um só painel.' },
  { icon: Monitor, title: 'Painel para gestão completa', description: 'Controle total dos pedidos, produtos e vendas.' },
  { icon: InfinityIcon, title: 'Sem limites de produtos e pedidos', description: 'Cadastre quantos produtos e receba quantos pedidos precisar.' },
  { icon: Printer, title: 'Impressão automática', description: 'Imprima automaticamente os pedidos na cozinha.' },
  { icon: Smartphone, title: 'Controle via celular', description: 'Gerencie seu negócio de qualquer lugar pelo smartphone.' },
  { icon: Users2, title: 'Usuários e permissões', description: 'Controle de acesso para diferentes níveis de usuário.' },
  { icon: BarChart3, title: 'Relatórios de vendas e clientes', description: 'Analise suas vendas e conheça melhor seus clientes.' },
];

export default function Index() {
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedNiche, setSelectedNiche] = useState('burger-shop');
  const [loading, setLoading] = useState(false);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { settings: globalSettings } = useGlobalSettings();

  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(heroScroll, [0, 1], [0, 120]);
  const heroRotate = useTransform(heroScroll, [0, 1], [0, -8]);
  const heroScale = useTransform(heroScroll, [0, 1], [1, 0.9]);

  useEffect(() => {
    if (globalSettings.landing_pixel_id) loadLandingPixel(globalSettings.landing_pixel_id);
  }, [globalSettings.landing_pixel_id]);

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth' });

  const generateSlug = (name: string) => {
    const base = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `${base}-${Date.now().toString(36).slice(-4)}`;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !email.trim() || !password.trim()) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' }); return;
    }
    if (password.length < 6) {
      toast({ title: 'A senha deve ter pelo menos 6 caracteres', variant: 'destructive' }); return;
    }
    setLoading(true);
    trackLandingEvent('Lead', { content_name: 'landing_signup', segment: selectedNiche });
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: { emailRedirectTo: `${window.location.origin}/admin` }
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Erro ao criar conta');
      if (!authData.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw new Error('Conta criada, mas não conseguimos iniciar sessão automaticamente. Faça login.');
      }
      const slug = generateSlug(storeName.trim());
      const { data: storeId, error: storeError } = await supabase.rpc('create_user_store_with_template', {
        p_store_name: storeName.trim(), p_store_slug: slug, p_template_slug: selectedNiche
      });
      if (storeError) throw storeError;
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      await supabase.from('stores').update({ trial_expires_at: sevenDaysFromNow.toISOString() }).eq('id', storeId);
      const nicheLabel = NICHE_OPTIONS.find(n => n.slug === selectedNiche)?.name || 'Outro';
      trackLandingEvent('CompleteRegistration', {
        content_name: 'store_created', segment: nicheLabel,
        value: globalSettings.subscription_price, currency: 'BRL', status: 'trial',
      });
      toast({ title: '🎉 Loja criada com sucesso!', description: 'Você tem 7 dias grátis para testar.' });
      sendLeadNotification({ storeName: storeName.trim(), email: email.trim(), segment: nicheLabel }).catch(console.error);
      navigate('/admin');
    } catch (error: any) {
      const raw = (error?.message || '').toLowerCase();
      let message = 'Erro ao criar conta. Tente novamente.';
      if (raw.includes('already registered') || raw.includes('already been registered') || raw.includes('user already')) message = 'Este e-mail já está cadastrado. Faça login.';
      else if (raw.includes('pwned') || raw.includes('weak') || raw.includes('compromised') || raw.includes('leaked')) message = 'Esta senha é muito comum / vazada. Escolha uma senha mais forte.';
      else if (raw.includes('password') && raw.includes('short')) message = 'A senha é muito curta. Use pelo menos 6 caracteres.';
      else if (raw.includes('invalid') && raw.includes('email')) message = 'E-mail inválido.';
      else if (raw.includes('slug') || raw.includes('already in use')) message = 'Esse nome gerou um link em uso. Tente um nome ligeiramente diferente.';
      else if (raw.includes('rate')) message = 'Muitas tentativas. Aguarde alguns segundos e tente novamente.';
      else if (error?.message) message = `Erro: ${error.message}`;
      toast({ title: message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const price = globalSettings.subscription_price || 49.9;
  const priceFmt = price.toFixed(2).replace('.', ',');

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png?v=5" alt="DeliveryPro" className="w-8 h-8" />
            <span className="font-bold text-lg tracking-tight">DeliveryPro</span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <a href="#precos" className="hidden sm:inline text-sm text-foreground/70 hover:text-foreground transition-colors">Preços</a>
            <button onClick={scrollToForm} className="hidden sm:inline text-sm text-foreground/70 hover:text-foreground transition-colors">Cadastro</button>
            <Link to="/auth">
              <Button className="bg-primary hover:bg-primary/90 text-white h-9 px-5 rounded-lg">Entrar</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="relative max-w-6xl mx-auto px-4 md:px-6 pt-14 md:pt-20 pb-16 md:pb-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-6">
              Cardápio digital e gestor de pedidos por{' '}
              <span className="text-primary">R$ {priceFmt}/mês</span>
            </h1>
            <p className="text-lg text-foreground/70 mb-8">
              <strong className="text-foreground">7 dias grátis</strong> sem compromisso.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={`https://wa.me/${((globalSettings as any).support_whatsapp || '5511999999999').replace(/\D/g, '')}?text=${encodeURIComponent('Olá! Quero saber mais sobre a DeliveryPro.')}`}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl border border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 font-medium transition-colors"
              >
                <MessageCircle className="w-5 h-5" /> Chamar no WhatsApp
              </a>
              <Button onClick={scrollToForm} className="h-12 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-base gap-2">
                Cadastrar <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            <p className="mt-6 text-sm text-foreground/60">✓ Sem cartão de crédito &nbsp; ✓ Setup em 5 min &nbsp; ✓ Cancele quando quiser</p>
          </div>

          {/* Hero visual: admin panel + phone overlap */}
          <div className="relative h-[380px] md:h-[440px]">
            <div className="absolute inset-x-0 top-4 bg-neutral-950 border border-white/10 rounded-2xl shadow-2xl p-3 md:p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="ml-3 text-xs text-white/50">DeliveryPro · Painel</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div className="col-span-1 space-y-1.5 border-r border-white/10 pr-2">
                  {['Pedidos', 'Cardápio', 'Categorias', 'Locais', 'Configurações'].map(x => (
                    <div key={x} className="px-2 py-1.5 rounded bg-white/5 text-white/70">{x}</div>
                  ))}
                </div>
                <div className="col-span-2 space-y-1.5">
                  <div className="flex gap-1">
                    {['NOVO', 'EM PREP', 'PRONTO', 'FINALIZADO'].map(t => (
                      <div key={t} className="flex-1 text-center py-1 rounded bg-primary/20 text-primary text-[9px] font-bold">{t}</div>
                    ))}
                  </div>
                  {[
                    { n: 'Antônio F.', v: '64,90', s: 'Pago', c: 'bg-emerald-500/20 text-emerald-400' },
                    { n: 'José A.', v: '32,70', s: 'PIX', c: 'bg-yellow-500/20 text-yellow-400' },
                    { n: 'Maria S.', v: '48,00', s: 'Dinheiro', c: 'bg-blue-500/20 text-blue-400' },
                  ].map((r, i) => (
                    <div key={i} className="flex items-center justify-between bg-white/5 rounded p-2">
                      <div>
                        <div className="text-white text-[10px] font-medium">{r.n}</div>
                        <div className="text-white/50">R$ {r.v}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded ${r.c} text-[9px] font-bold`}>{r.s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Phone overlay */}
            <div className="absolute left-2 md:left-6 bottom-0 w-[150px] md:w-[180px]">
              <div className="bg-neutral-900 rounded-[1.5rem] p-1.5 shadow-2xl">
                <div className="bg-white rounded-[1.2rem] overflow-hidden aspect-[9/19]">
                  <div className="h-6 bg-primary text-white flex items-center justify-between px-2 text-[8px]">
                    <span>Cardápio</span><span>●●●</span>
                  </div>
                  <div className="p-2 space-y-1.5">
                    <div className="h-8 bg-primary/10 rounded" />
                    <div className="flex gap-1"><span className="text-[7px] px-1.5 py-0.5 rounded bg-primary text-white">Lanches</span><span className="text-[7px] px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-700">Bebidas</span></div>
                    {[1,2,3].map(i => (
                      <div key={i} className="flex gap-1.5 items-center p-1 border border-neutral-200 rounded">
                        <div className="w-8 h-8 bg-neutral-200 rounded" />
                        <div className="flex-1">
                          <div className="h-1.5 bg-neutral-300 rounded w-3/4 mb-1" />
                          <div className="h-1.5 bg-neutral-200 rounded w-1/2" />
                        </div>
                        <div className="text-[7px] text-primary font-bold">R$ 12</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Como funciona */}
      <section className="py-16 md:py-24 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal direction="up" className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Como funciona?</h2>
            <p className="text-foreground/60 max-w-2xl mx-auto">Veja como é simples o processo do momento que você envia o link até a venda.</p>
          </ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {HOW_STEPS.map((step, i) => (
              <ScrollReveal key={i} direction="up" delay={i * 0.1} className="text-center">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl ${step.color} flex items-center justify-center shadow-lg`}>
                  <step.icon className="w-8 h-8 text-white" strokeWidth={2.2} />
                </div>
                <h3 className="font-bold text-primary mb-2">{step.title}</h3>
                <p className="text-sm text-foreground/60">{step.description}</p>
              </ScrollReveal>
            ))}
          </div>
          <div className="mt-12 text-center">
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
              ⚡ Processo 100% automatizado
            </span>
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section className="py-16 md:py-24 px-4 md:px-6 bg-secondary/40 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal direction="up" className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Alguns dos nossos recursos</h2>
            <p className="text-foreground/60 max-w-2xl mx-auto">Funcionalidades completas para automatizar e otimizar todo o processo de vendas do seu negócio.</p>
          </ScrollReveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f, i) => (
              <ScrollReveal key={i} direction="up" delay={(i % 4) * 0.05}>
                <div className="h-full p-6 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center mb-4 shadow-md">
                    <f.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-foreground/60 leading-relaxed">{f.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
          <div className="mt-12 text-center">
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
              ⚡ E muito mais funcionalidades sendo adicionadas constantemente
            </span>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <div id="precos">
        <ScrollReveal direction="up">
          <PricingSection onCtaClick={scrollToForm} />
        </ScrollReveal>
      </div>

      {/* FAQ */}
      <ScrollReveal direction="up">
        <FAQSection />
      </ScrollReveal>

      {/* Signup */}
      <section ref={formRef} className="py-20 md:py-24 px-4 md:px-6">
        <div className="max-w-lg mx-auto">
          <div className="bg-card rounded-3xl p-8 md:p-10 shadow-xl border border-border">
            <div className="text-center mb-8">
              <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-sm font-medium mb-4">🎁 7 dias grátis</span>
              <h3 className="text-2xl font-bold mb-2">Crie sua loja agora</h3>
              <p className="text-foreground/60">Setup em menos de 5 minutos</p>
            </div>
            <form onSubmit={handleSignup} className="space-y-5">
              <div className="space-y-3">
                <Label className="font-medium">Tipo do seu negócio</Label>
                <div className="grid grid-cols-2 gap-3">
                  {NICHE_OPTIONS.map((niche) => {
                    const Icon = niche.icon;
                    const selected = selectedNiche === niche.slug;
                    return (
                      <button key={niche.slug} type="button" onClick={() => setSelectedNiche(niche.slug)}
                        className={`relative p-4 rounded-xl border-2 transition-all text-left ${selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${niche.color} flex items-center justify-center mb-2`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <p className={`font-semibold text-sm ${selected ? 'text-primary' : ''}`}>{niche.name}</p>
                        <p className="text-xs text-foreground/50 mt-0.5">{niche.description}</p>
                        {selected && <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="storeName" className="font-medium">Nome da sua Loja</Label>
                <div className="relative">
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                  <Input id="storeName" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Ex: Burger do João" className="pl-12 h-12 rounded-xl" maxLength={100} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="font-medium">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="pl-12 h-12 rounded-xl" maxLength={255} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="font-medium">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="pl-12 h-12 rounded-xl" minLength={6} />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg shadow-primary/20">
                {loading ? 'Criando sua loja...' : 'Começar meu Teste Grátis'}
              </Button>
            </form>
            <p className="text-xs text-foreground/50 text-center mt-6">Após 7 dias, apenas R$ {priceFmt}/mês. Cancele quando quiser.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 md:px-6 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png?v=5" alt="DeliveryPro" className="w-6 h-6" />
            <span className="font-semibold">DeliveryPro</span>
          </div>
          <p className="text-sm text-foreground/60">© {new Date().getFullYear()} DeliveryPro. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
