import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SystemShowcase } from '@/components/landing/SystemShowcase';
import { SavingsComparisonSection } from '@/components/landing/SavingsComparisonSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { sendLeadNotification } from '@/lib/whatsappLeadNotification';
import { 
  TrendingUp, 
  ShoppingCart, 
  BarChart3, 
  Store,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  Zap,
  Users,
  Clock,
  Pizza,
  Leaf,
  IceCream,
  UtensilsCrossed
} from 'lucide-react';

const NICHE_OPTIONS = [
  { 
    slug: 'burger-shop', 
    name: 'Hamburgueria', 
    icon: UtensilsCrossed, 
    color: 'from-orange-500 to-red-500',
    description: 'Lanchonetes e fast-food'
  },
  { 
    slug: 'pizza', 
    name: 'Pizzaria', 
    icon: Pizza, 
    color: 'from-red-500 to-yellow-500',
    description: 'Pizzas e massas'
  },
  { 
    slug: 'acai-shop', 
    name: 'Açaiteria', 
    icon: IceCream, 
    color: 'from-purple-500 to-pink-500',
    description: 'Açaí e sorvetes'
  },
  { 
    slug: 'grocery', 
    name: 'Hortifruti', 
    icon: Leaf, 
    color: 'from-green-500 to-emerald-500',
    description: 'Frutas e verduras'
  },
];

export default function Index() {
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedNiche, setSelectedNiche] = useState('burger-shop');
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const generateSlug = (name: string) => {
    const base = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const suffix = Date.now().toString(36).slice(-4);
    return `${base}-${suffix}`;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!storeName.trim() || !email.trim() || !password.trim()) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }

    if (password.length < 6) {
      toast({ title: 'A senha deve ter pelo menos 6 caracteres', variant: 'destructive' });
      return;
    }

    if (!selectedNiche) {
      toast({ title: 'Selecione o tipo do seu negócio', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/admin` }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Erro ao criar conta');

      const slug = generateSlug(storeName.trim());
      const { data: storeId, error: storeError } = await supabase.rpc('create_user_store_with_template', {
        p_store_name: storeName.trim(),
        p_store_slug: slug,
        p_template_slug: selectedNiche
      });

      if (storeError) throw storeError;

      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      
      await supabase
        .from('stores')
        .update({ trial_expires_at: sevenDaysFromNow.toISOString() })
        .eq('id', storeId);

      const nicheLabel = NICHE_OPTIONS.find(n => n.slug === selectedNiche)?.name || 'Outro';
      
      toast({ 
        title: '🎉 Loja criada com sucesso!', 
        description: 'Você tem 7 dias grátis para testar.' 
      });

      sendLeadNotification({
        storeName: storeName.trim(),
        email: email.trim(),
        segment: nicheLabel,
      }).catch(console.error);

      navigate('/admin');
    } catch (error: any) {
      console.error('Signup error:', error);
      let message = 'Erro ao criar conta. Tente novamente.';
      if (error.message?.includes('already registered')) {
        message = 'Este e-mail já está cadastrado. Faça login.';
      }
      toast({ title: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: TrendingUp,
      title: 'Upsell Inteligente',
      description: 'Sugira combos e adicionais no momento certo da compra. Aumente seu ticket médio automaticamente.',
    },
    {
      icon: ShoppingCart,
      title: 'Recupere Vendas Perdidas',
      description: 'Carrinhos abandonados? Recupere clientes com mensagens automáticas via WhatsApp.',
    },
    {
      icon: BarChart3,
      title: 'Relatórios Completos',
      description: 'Acompanhe vendas, produtos mais pedidos e desempenho do seu delivery em tempo real.',
    },
  ];

  const stats = [
    { icon: Users, value: '+500', label: 'Lojas ativas' },
    { icon: Zap, value: '+15%', label: 'Aumento no ticket' },
    { icon: Clock, value: '< 5min', label: 'Setup completo' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-background/80 backdrop-blur-md border-b border-neutral-100 dark:border-border">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-end">
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" className="text-neutral-600 dark:text-foreground/80 hover:text-neutral-900 dark:hover:text-foreground">
                Entrar
              </Button>
            </Link>
            <Button 
              onClick={scrollToForm}
              className="bg-primary hover:bg-primary/90 text-white hidden sm:flex"
            >
              Começar Grátis
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="max-w-5xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-16 text-center relative">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald/10 text-emerald text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Zero taxas por pedido
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground tracking-tight mb-6 leading-[1.1]">
            O cardápio digital<br />
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              que vende mais
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Seja hamburgueria, açaiteria, pizzaria ou hortifruti: 
            <strong className="text-foreground/80"> aumente seu ticket médio com upsell inteligente</strong> e receba pedidos direto no WhatsApp.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg"
              onClick={scrollToForm}
              className="h-14 px-8 text-lg bg-primary hover:bg-primary/90 text-white gap-2 shadow-lg shadow-primary/20"
            >
              Começar Meu Teste Grátis
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mb-8">
            ✓ 7 dias grátis &nbsp;&nbsp; ✓ Sem cartão de crédito &nbsp;&nbsp; ✓ Cancele quando quiser
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-12">
            {stats.map((stat, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* System Showcase - Phone Mockups Carousel */}
      <section className="py-16 md:py-24 bg-secondary/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 px-4">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              Pronto para seu negócio
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Um sistema para cada segmento
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Cardápios otimizados para hamburguerias, açaiterias, pizzarias e hortifrutis
            </p>
          </div>
          
          <SystemShowcase onCtaClick={scrollToForm} />
        </div>
      </section>

      {/* Savings Comparison Section */}
      <SavingsComparisonSection onCtaClick={scrollToForm} />

      {/* Features Grid */}
      <section className="py-20 md:py-24 px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              Funcionalidades
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Tudo que você precisa para vender mais
            </h2>
            <p className="text-muted-foreground text-lg">
              Ferramentas simples e poderosas para o seu delivery
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="group p-8 rounded-3xl bg-card border border-border hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-7 h-7 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection onCtaClick={scrollToForm} />

      {/* FAQ Section */}
      <FAQSection />

      {/* Signup Form */}
      <section ref={formRef} className="py-20 md:py-24 pb-48 md:pb-56 px-4 md:px-6">
        <div className="max-w-lg mx-auto">
          <div className="bg-card rounded-3xl p-8 md:p-10 shadow-xl border border-border">
            <div className="text-center mb-8">
              <span className="inline-block px-4 py-1.5 rounded-full bg-emerald/10 text-emerald text-sm font-medium mb-4">
                🎁 7 dias grátis
              </span>
              <h3 className="text-2xl font-bold text-foreground mb-2">
                Crie sua loja agora
              </h3>
              <p className="text-muted-foreground">
                Setup em menos de 5 minutos
              </p>
            </div>

            <form onSubmit={handleSignup} className="space-y-5">
              {/* Niche Selection */}
              <div className="space-y-3">
                <Label className="text-foreground/80 font-medium">Tipo do seu negócio</Label>
                <div className="grid grid-cols-2 gap-3">
                  {NICHE_OPTIONS.map((niche) => {
                    const IconComponent = niche.icon;
                    const isSelected = selectedNiche === niche.slug;
                    return (
                      <button
                        key={niche.slug}
                        type="button"
                        onClick={() => setSelectedNiche(niche.slug)}
                        className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                          isSelected 
                            ? 'border-primary bg-primary/5 shadow-md' 
                            : 'border-border hover:border-primary/50 bg-card'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${niche.color} flex items-center justify-center mb-2`}>
                          <IconComponent className="w-5 h-5 text-white" />
                        </div>
                        <p className={`font-semibold text-sm ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                          {niche.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{niche.description}</p>
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="storeName" className="text-foreground/80 font-medium">Nome da sua Loja</Label>
                <div className="relative">
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="storeName"
                    type="text"
                    placeholder="Ex: Burger do João"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="pl-12 h-12 bg-secondary border-border focus:border-primary focus:ring-primary rounded-xl text-foreground placeholder:text-muted-foreground"
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground/80 font-medium">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-12 bg-secondary border-border focus:border-primary focus:ring-primary rounded-xl text-foreground placeholder:text-muted-foreground"
                    maxLength={255}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground/80 font-medium">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 h-12 bg-secondary border-border focus:border-primary focus:ring-primary rounded-xl text-foreground placeholder:text-muted-foreground"
                    minLength={6}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-12 text-base bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20"
              >
                {loading ? 'Criando sua loja...' : 'Começar meu Teste Grátis'}
              </Button>
            </form>

            <p className="text-xs text-muted-foreground text-center mt-6">
              Após 7 dias, apenas R$ 97/mês. Cancele quando quiser.
            </p>
          </div>

          {/* Trust Signals */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-8 mt-8 mb-8 text-sm text-muted-foreground">
            {['Setup em 5 min', 'Sem taxas ocultas', 'Cancele quando quiser'].map((item, idx) => (
              <div key={idx} className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          
          {/* Extra bottom spacing text */}
          <p className="text-center text-sm text-emerald font-medium pb-8">
            ✓ 7 dias grátis • Sem compromisso
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 md:px-6 bg-gradient-to-r from-primary to-primary/80">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Pronto para vender mais?
          </h2>
          <p className="text-white/80 text-lg mb-8">
            Junte-se a mais de 500 lojas que já aumentaram suas vendas
          </p>
          <Button 
            size="lg"
            onClick={scrollToForm}
            className="h-14 px-8 text-lg bg-white text-primary hover:bg-white/90 gap-2 shadow-lg"
          >
            Começar Meu Teste Grátis
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 md:px-6 border-t border-neutral-100 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-bold text-lg text-neutral-900">
            Menu<span className="text-primary">Digital</span>
          </span>
          <p className="text-sm text-neutral-400">
            © {new Date().getFullYear()} MenuDigital. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
