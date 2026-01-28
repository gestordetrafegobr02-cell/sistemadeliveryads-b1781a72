import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RotatingText } from '@/components/landing/RotatingText';
import { FloatingElements } from '@/components/landing/FloatingElements';
import { SegmentShowcase } from '@/components/landing/SegmentShowcase';
import { GlassFeatureCard } from '@/components/landing/GlassFeatureCard';
import { AnimatedCTAButton } from '@/components/landing/AnimatedCTAButton';
import { ScrollReveal } from '@/components/landing/ScrollReveal';
import { 
  Rocket, 
  TrendingUp, 
  Wallet, 
  BarChart3, 
  CheckCircle2,
  MessageCircle,
  Lock,
  Clock,
  HelpCircle,
  ChevronDown,
  Store,
  Camera,
  Share2,
  DollarSign,
  Sparkles,
  ShieldCheck,
  Zap
} from 'lucide-react';

export default function Index() {
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        p_template_slug: 'burger'
      });

      if (storeError) throw storeError;

      // Set trial to exactly 7 days
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      
      await supabase
        .from('stores')
        .update({ trial_expires_at: sevenDaysFromNow.toISOString() })
        .eq('id', storeId);

      toast({ 
        title: '🎉 Loja criada com sucesso!', 
        description: 'Você tem 7 dias grátis para testar.' 
      });

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
      icon: Rocket,
      title: 'Upsell Inteligente',
      description: 'Aumente seu ticket médio automaticamente oferecendo bebidas e acompanhamentos no momento certo da compra.',
      highlight: true
    },
    {
      icon: TrendingUp,
      title: 'Recuperação de Vendas',
      description: 'Recupere até 30% dos carrinhos abandonados com mensagens automáticas e personalizadas via WhatsApp.',
      highlight: true
    },
    {
      icon: Wallet,
      title: 'Pix Integrado',
      description: 'Pagamento instantâneo com chave Pix configurada. Sem taxas, sem intermediários.'
    },
    {
      icon: BarChart3,
      title: 'Analytics em Tempo Real',
      description: 'Saiba exatamente quais produtos e bairros geram mais receita para tomar decisões inteligentes.'
    },
    {
      icon: Zap,
      title: 'Setup em 2 Minutos',
      description: 'Comece a vender imediatamente com templates prontos e configuração guiada.'
    },
    {
      icon: ShieldCheck,
      title: 'Sem Taxas por Venda',
      description: 'Diferente de outros sistemas, não cobramos percentual sobre suas vendas. O lucro é todo seu.'
    }
  ];

  const steps = [
    { icon: Store, title: 'Cadastre', description: 'Crie sua conta em segundos' },
    { icon: Camera, title: 'Configure', description: 'Monte seu cardápio digital' },
    { icon: Share2, title: 'Divulgue', description: 'Compartilhe nas redes' },
    { icon: DollarSign, title: 'Lucre', description: 'Venda mais todos os dias' }
  ];

  const faqs = [
    {
      question: 'Precisa de cartão de crédito para testar?',
      answer: 'Não! Você testa por 7 dias grátis sem precisar cadastrar nenhum cartão. Simples assim.'
    },
    {
      question: 'Tem fidelidade ou contrato?',
      answer: 'Não tem fidelidade. Você pode cancelar quando quiser, sem multas ou burocracia.'
    },
    {
      question: 'Como recebo meu dinheiro?',
      answer: 'O dinheiro vai direto para você via Pix. Não ficamos com nenhuma taxa sobre suas vendas.'
    },
    {
      question: 'Funciona em qualquer dispositivo?',
      answer: 'Sim! Tanto você quanto seus clientes podem acessar perfeitamente pelo celular, tablet ou computador.'
    }
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Hero Section */}
      <header className="relative min-h-screen flex flex-col">
        {/* Background Effects */}
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="absolute inset-0 noise-overlay" />
        
        {/* Gradient Orbs */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/15 rounded-full blur-[100px] translate-y-1/2" />
        
        <FloatingElements />

        {/* Navigation */}
        <motion.nav 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-20 max-w-7xl mx-auto w-full px-4 md:px-6 py-6 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-2xl md:text-3xl text-foreground">
              Menu<span className="text-gradient">Digital</span>
            </span>
          </div>
          <Link to="/auth">
            <Button variant="outline" className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-primary/10 hover:border-primary/50">
              Entrar
            </Button>
          </Link>
        </motion.nav>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex items-center">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-20 w-full">
            <div className="max-w-4xl mx-auto text-center">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-premium mb-8"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-sm text-foreground/80">
                  <span className="text-emerald-400 font-semibold">7 dias grátis</span> • Sem cartão de crédito
                </span>
              </motion.div>

              {/* Main Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-foreground mb-4 leading-[1.1]"
              >
                O sistema ideal para sua
              </motion.h1>
              
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl mb-8"
              >
                <RotatingText />
              </motion.div>

              {/* Subheadline */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
              >
                Cardápio digital profissional com <span className="text-foreground font-medium">upsell inteligente</span>, 
                recuperação automática de vendas e gestão completa do seu delivery.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
              >
                <AnimatedCTAButton onClick={scrollToForm}>
                  Começar Teste Grátis
                </AnimatedCTAButton>
                
                <Link to="/shop/demo">
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="h-14 px-8 text-lg border-border/50 bg-card/30 backdrop-blur-sm hover:bg-card/50"
                  >
                    Ver Demonstração
                  </Button>
                </Link>
              </motion.div>

              {/* Trust Signals */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground"
              >
                {[
                  'Setup em 2 minutos',
                  'Sem mensalidade no teste',
                  'Suporte via WhatsApp'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>{item}</span>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2"
          >
            <motion.div className="w-1.5 h-1.5 rounded-full bg-primary" />
          </motion.div>
        </motion.div>
      </header>

      {/* Segment Showcase Section */}
      <section className="py-24 px-4 md:px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/30 to-transparent" />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <ScrollReveal>
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20 mb-6">
                Adaptável ao seu negócio
              </span>
              <h2 className="font-display text-3xl md:text-5xl text-foreground mb-4">
                Como o sistema se adapta a <span className="text-gradient">você</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                Seja qual for seu segmento, temos as ferramentas certas para você vender mais.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <SegmentShowcase />
          </ScrollReveal>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-6">
                Funcionalidades Premium
              </span>
              <h2 className="font-display text-3xl md:text-5xl text-foreground mb-4">
                Tudo que você precisa para <span className="text-gradient-emerald">vender mais</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                Ferramentas profissionais que grandes redes usam, agora acessíveis para o seu delivery.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <GlassFeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                highlight={feature.highlight}
                delay={index * 0.1}
              />
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-4 md:px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/20 to-transparent" />
        
        <div className="max-w-5xl mx-auto relative z-10">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="font-display text-3xl md:text-5xl text-foreground mb-4">
                Comece a vender em <span className="text-gradient">4 passos</span>
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <ScrollReveal key={index} delay={index * 0.15}>
                <div className="text-center group">
                  <motion.div
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    className="relative inline-flex mb-6"
                  >
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-emerald-500/20 border border-primary/30 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-primary/20 transition-shadow">
                      <step.icon className="w-9 h-9 text-primary" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-emerald-500 text-primary-foreground font-bold text-sm flex items-center justify-center shadow-lg">
                      {index + 1}
                    </span>
                  </motion.div>
                  <h4 className="font-display text-xl text-foreground mb-2">{step.title}</h4>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Signup Form */}
      <section ref={formRef} className="py-24 px-4 md:px-6 relative">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[150px]" />
        
        <ScrollReveal>
          <div className="max-w-lg mx-auto relative z-10">
            <motion.div 
              className="relative"
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              {/* Animated border glow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-primary via-emerald-500 to-primary rounded-3xl opacity-50 blur-sm animate-pulse-slow" />
              
              <div className="relative glass-card p-8 md:p-10 rounded-3xl">
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center mx-auto mb-6"
                  >
                    <Sparkles className="w-8 h-8 text-primary-foreground" />
                  </motion.div>
                  <h3 className="font-display text-2xl md:text-3xl text-foreground mb-2">
                    Crie sua loja agora
                  </h3>
                  <p className="text-muted-foreground">
                    <span className="text-emerald-400 font-semibold">7 dias grátis</span> • Sem cartão de crédito
                  </p>
                </div>

                <form onSubmit={handleSignup} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="storeName" className="text-foreground">Nome da sua Loja</Label>
                    <div className="relative group">
                      <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        id="storeName"
                        type="text"
                        placeholder="Ex: Burger do João"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        className="pl-12 h-14 bg-background/50 border-border/50 focus:border-primary/50 rounded-xl text-base"
                        maxLength={100}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground">E-mail</Label>
                    <div className="relative group">
                      <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-12 h-14 bg-background/50 border-border/50 focus:border-primary/50 rounded-xl text-base"
                        maxLength={255}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-foreground">Senha</Label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-12 h-14 bg-background/50 border-border/50 focus:border-primary/50 rounded-xl text-base"
                        minLength={6}
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="relative w-full h-14 text-lg bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 text-primary-foreground border-0 gap-3 group overflow-hidden"
                  >
                    {/* Animated glow */}
                    <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary via-emerald-500 to-primary opacity-70 blur-md group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <span className="relative z-10 flex items-center gap-2">
                      {loading ? (
                        <>
                          <Clock className="w-5 h-5 animate-spin" />
                          Criando sua loja...
                        </>
                      ) : (
                        <>
                          Começar meu Teste Grátis
                          <motion.span
                            animate={{ x: [0, 5, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            →
                          </motion.span>
                        </>
                      )}
                    </span>
                  </Button>
                </form>

                <p className="text-xs text-muted-foreground text-center mt-6">
                  Ao criar sua conta, você concorda com nossos Termos de Uso e Política de Privacidade.
                </p>
              </div>
            </motion.div>
          </div>
        </ScrollReveal>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-4 md:px-6">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-5xl text-foreground mb-4">
                Perguntas <span className="text-gradient">Frequentes</span>
              </h2>
            </div>
          </ScrollReveal>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <ScrollReveal key={index} delay={index * 0.1}>
                <motion.details 
                  className="glass-card p-6 group cursor-pointer rounded-2xl"
                  whileHover={{ scale: 1.01 }}
                >
                  <summary className="flex items-center justify-between font-medium text-foreground list-none">
                    <span className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <HelpCircle className="w-5 h-5 text-primary" />
                      </div>
                      {faq.question}
                    </span>
                    <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-4 pl-13 text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </motion.details>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 md:px-6">
        <ScrollReveal>
          <div className="max-w-4xl mx-auto relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-emerald-500/20 to-primary/20 rounded-[2rem] blur-2xl" />
            
            <div className="relative glass-card p-10 md:p-16 text-center rounded-3xl overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 left-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-0 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl" />
              
              <div className="relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  className="text-6xl mb-6"
                >
                  🚀
                </motion.div>
                
                <h2 className="font-display text-3xl md:text-5xl text-foreground mb-4">
                  Pronto para aumentar suas vendas?
                </h2>
                <p className="text-muted-foreground mb-8 max-w-2xl mx-auto text-lg">
                  Junte-se a centenas de empreendedores que já transformaram seu delivery em uma máquina de vendas.
                </p>
                
                <AnimatedCTAButton onClick={scrollToForm}>
                  Criar Minha Loja Grátis
                </AnimatedCTAButton>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 md:px-6 border-t border-border/30">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display text-xl text-foreground">
                Menu<span className="text-gradient">Digital</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} MenuDigital. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
