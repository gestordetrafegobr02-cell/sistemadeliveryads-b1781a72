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
import { AnimatedBackground } from '@/components/landing/AnimatedBackground';
import { Floating3DScene } from '@/components/landing/Floating3DScene';
import { motion, useScroll, useTransform } from 'framer-motion';
import { sendLeadNotification } from '@/lib/whatsappLeadNotification';
import hero3d from '@/assets/hero-3d-app.png';
import icon3dStore from '@/assets/icon-3d-store.png';
import icon3dLocation from '@/assets/icon-3d-location.png';
import icon3dWallet from '@/assets/icon-3d-wallet.png';
import icon3dDelivery from '@/assets/icon-3d-delivery.png';
import icon3dSmartphone from '@/assets/landing/icon3d-smartphone.png';
import icon3dBag from '@/assets/landing/icon3d-bag.png';
import icon3dScooter from '@/assets/landing/icon3d-scooter.png';
import icon3dChart from '@/assets/landing/icon3d-chart.png';
import icon3dChat from '@/assets/landing/icon3d-chat.png';
import icon3dPrinter from '@/assets/landing/icon3d-printer.png';
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
  { img: icon3dSmartphone, glow: 'hsl(25 95% 55%)', title: 'Cardápio personalizável', description: 'Customize cores, logos e layout do seu cardápio digital.' },
  { img: icon3dBag,        glow: 'hsl(25 95% 55%)', title: 'PDV, retirada, delivery e mesas', description: 'Múltiplas formas de atendimento em um só painel.' },
  { img: icon3dChart,      glow: 'hsl(145 70% 50%)', title: 'Painel de gestão completa', description: 'Controle total de pedidos, produtos e vendas.' },
  { img: icon3dChat,       glow: 'hsl(145 70% 50%)', title: 'Pedidos direto no WhatsApp', description: 'Zero fricção pro cliente, alta conversão pra loja.' },
  { img: icon3dPrinter,    glow: 'hsl(25 95% 55%)', title: 'Impressão automática', description: 'Imprima automaticamente os pedidos na cozinha.' },
  { img: icon3dScooter,    glow: 'hsl(0 85% 55%)', title: 'Delivery e retirada', description: 'Fluxo completo pra entregas locais e balcão.' },
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
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <AnimatedBackground />
      <div className="relative z-10">
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
              <Button
                onClick={() => setLeadModalOpen(true)}
                className="h-12 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-base gap-2 shadow-lg shadow-emerald-500/30"
              >
                <MessageCircle className="w-5 h-5" /> Solicitar meu cardápio
              </Button>
              <Button onClick={scrollToForm} variant="outline" className="h-12 px-6 rounded-xl font-semibold text-base gap-2">
                Cadastrar sozinho <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            <p className="mt-6 text-sm text-foreground/60">✓ Sem cartão de crédito &nbsp; ✓ Setup em 5 min &nbsp; ✓ Cancele quando quiser</p>
          </div>

          {/* Hero visual: 3D app illustration with parallax */}
          <motion.div
            ref={heroRef as any}
            style={{ y: heroY, rotate: heroRotate, scale: heroScale }}
            className="relative h-[380px] md:h-[500px] flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-gradient-radial from-primary/20 via-transparent to-transparent blur-3xl" />
            <motion.img
              src={hero3d}
              alt="App DeliveryPro em 3D"
              width={1024}
              height={1024}
              className="relative z-10 max-h-full w-auto drop-shadow-2xl"
              style={{ filter: 'drop-shadow(0 40px 60px hsl(var(--primary) / 0.3))' }}
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
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
              <ScrollReveal key={i} direction="up" delay={i * 0.12} className="text-center">
                <div className="mb-4 flex justify-center">
                  <Icon3D src={step.img} alt={step.title} size={128} delay={i * 0.15} glowColor={step.glow} />
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <ScrollReveal key={i} direction="up" delay={(i % 3) * 0.08}>
                <div className="h-full p-6 rounded-2xl bg-card/80 backdrop-blur border border-border hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 transition-all flex flex-col items-center text-center">
                  <div className="mb-4">
                    <Icon3D src={f.img} alt={f.title} size={96} delay={i * 0.05} glowColor={f.glow} />
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

      {/* Ecossistema 3D */}
      <Floating3DScene />

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

      {/* Floating WhatsApp FAB */}
      <motion.button
        onClick={() => setLeadModalOpen(true)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: 'spring', stiffness: 200 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-emerald-500 text-white shadow-2xl shadow-emerald-500/50 flex items-center justify-center animate-pulse-glow"
        aria-label="Solicitar cardápio no WhatsApp"
      >
        <MessageCircle className="w-7 h-7" />
      </motion.button>

      <WhatsAppLeadModal open={leadModalOpen} onOpenChange={setLeadModalOpen} />
      </div>
    </div>
  );
}
