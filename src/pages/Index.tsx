import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowRight, 
  Rocket, 
  TrendingUp, 
  Wallet, 
  BarChart3, 
  CheckCircle2,
  MessageCircle,
  CreditCard,
  Clock,
  HelpCircle,
  ChevronDown,
  Store,
  Camera,
  Share2,
  DollarSign
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
      // 1. Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/admin` }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Erro ao criar conta');

      // 2. Create store with template
      const slug = generateSlug(storeName.trim());
      const { data: storeId, error: storeError } = await supabase.rpc('create_user_store_with_template', {
        p_store_name: storeName.trim(),
        p_store_slug: slug,
        p_template_slug: 'burger'
      });

      if (storeError) throw storeError;

      // 3. Update trial to 7 days (landing page special)
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
      description: 'Ofereça bebidas e acompanhamentos automaticamente e aumente seu ticket médio.'
    },
    {
      icon: TrendingUp,
      title: 'Recuperação de Vendas',
      description: 'Recupere clientes que abandonaram o carrinho com mensagens automáticas.'
    },
    {
      icon: Wallet,
      title: 'Pix Automatizado',
      description: 'Facilite o pagamento para seu cliente com chave Pix integrada.'
    },
    {
      icon: BarChart3,
      title: 'Relatórios Reais',
      description: 'Saiba quais bairros e produtos te dão mais lucro com dados reais.'
    }
  ];

  const steps = [
    {
      icon: Store,
      title: 'Cadastre sua Loja',
      description: 'Leva menos de 2 minutos para começar.'
    },
    {
      icon: Camera,
      title: 'Monte seu Cardápio',
      description: 'Adicione seus produtos e fotos facilmente.'
    },
    {
      icon: Share2,
      title: 'Divulgue seu Link',
      description: 'Coloque na bio do Instagram e WhatsApp.'
    },
    {
      icon: DollarSign,
      title: 'Venda e Recupere',
      description: 'O sistema trabalha para aumentar seu lucro.'
    }
  ];

  const faqs = [
    {
      question: 'Precisa de cartão de crédito?',
      answer: 'Não! Você testa por 7 dias grátis sem precisar cadastrar nenhum cartão.'
    },
    {
      question: 'Tem fidelidade ou contrato?',
      answer: 'Não tem fidelidade. Você pode cancelar quando quiser, sem multas.'
    },
    {
      question: 'Como recebo meu dinheiro?',
      answer: 'O dinheiro vai direto para você via Pix. Não ficamos com nenhuma taxa sobre suas vendas.'
    },
    {
      question: 'Funciona no meu celular?',
      answer: 'Sim! Tanto você quanto seus clientes podem acessar perfeitamente pelo celular.'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/10" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        
        <nav className="relative z-10 max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <h1 className="font-display text-2xl md:text-3xl text-gradient">MenuDigital</h1>
          <Link to="/auth">
            <Button variant="outline" className="border-primary/50 hover:bg-primary/10">
              Já tenho conta
            </Button>
          </Link>
        </nav>

        <div className="relative z-10 max-w-5xl mx-auto px-4 py-16 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-sm text-primary font-medium">7 dias grátis • Sem cartão</span>
          </div>
          
          <h2 className="font-display text-4xl md:text-6xl lg:text-7xl text-foreground mb-6 leading-tight">
            Transforme seu WhatsApp em uma{' '}
            <span className="text-gradient">Máquina de Vendas</span>
          </h2>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
            Cardápio digital, Upsell inteligente, Recuperação de carrinhos e gestão completa. 
            <span className="text-foreground font-medium"> Comece agora com 7 dias grátis.</span>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={scrollToForm}
              className="btn-glow bg-primary text-primary-foreground h-14 px-8 text-lg gap-2 group"
            >
              Começar meu Teste Grátis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Link to="/shop/demo">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-border hover:bg-secondary">
                Ver Demonstração
              </Button>
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>Setup em 2 minutos</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>Sem mensalidade no teste</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>Suporte via WhatsApp</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </header>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h3 className="font-display text-3xl md:text-4xl text-foreground mb-4">
              Tudo que você precisa para <span className="text-gradient">vender mais</span>
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Ferramentas profissionais que grandes redes usam, agora acessíveis para o seu delivery.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="glass-card p-6 text-center group hover:border-primary/40 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-5 group-hover:glow-primary transition-all">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h4 className="font-display text-xl text-foreground mb-2">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps Timeline */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h3 className="font-display text-3xl md:text-4xl text-foreground mb-4">
              Comece a vender em <span className="text-gradient">4 passos simples</span>
            </h3>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mb-4 relative">
                    <step.icon className="w-7 h-7 text-primary" />
                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center">
                      {index + 1}
                    </span>
                  </div>
                  <h4 className="font-display text-lg text-foreground mb-2">{step.title}</h4>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Signup Form */}
      <section ref={formRef} className="py-20 px-4">
        <div className="max-w-lg mx-auto">
          <div className="glass-card p-8 md:p-10 animate-pulse-glow">
            <div className="text-center mb-8">
              <h3 className="font-display text-2xl md:text-3xl text-foreground mb-2">
                Crie sua loja agora
              </h3>
              <p className="text-muted-foreground">
                7 dias grátis • Sem cartão de crédito
              </p>
            </div>

            <form onSubmit={handleSignup} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="storeName" className="text-foreground">Nome da sua Loja</Label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="storeName"
                    type="text"
                    placeholder="Ex: Burger do João"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="pl-11 h-12 bg-background border-border"
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">E-mail</Label>
                <div className="relative">
                  <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-11 h-12 bg-background border-border"
                    maxLength={255}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Senha</Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 h-12 bg-background border-border"
                    minLength={6}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-14 text-lg btn-glow bg-primary text-primary-foreground gap-2"
              >
                {loading ? (
                  <>
                    <Clock className="w-5 h-5 animate-spin" />
                    Criando sua loja...
                  </>
                ) : (
                  <>
                    Começar meu Teste Grátis
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-xs text-muted-foreground text-center mt-6">
              Ao criar sua conta, você concorda com nossos Termos de Uso e Política de Privacidade.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="font-display text-3xl md:text-4xl text-foreground mb-4">
              Perguntas <span className="text-gradient">Frequentes</span>
            </h3>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <details 
                key={index} 
                className="glass-card p-5 group cursor-pointer"
              >
                <summary className="flex items-center justify-between font-medium text-foreground list-none">
                  <span className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    {faq.question}
                  </span>
                  <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-4 pl-8 text-muted-foreground">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto glass-card p-10 md:p-14 text-center animate-pulse-glow">
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-4">
            Pronto para aumentar suas vendas?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Junte-se a centenas de donos de delivery que já transformaram seu WhatsApp em uma máquina de vendas.
          </p>
          <Button 
            size="lg" 
            onClick={scrollToForm}
            className="btn-glow bg-primary text-primary-foreground h-14 px-10 text-lg gap-2"
          >
            Criar Minha Loja Grátis
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h4 className="font-display text-xl text-gradient mb-2">MenuDigital</h4>
              <p className="text-sm text-muted-foreground">
                Cardápio digital para deliveries que querem vender mais.
              </p>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a 
                href="https://wa.me/5511999999999" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-primary transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Suporte WhatsApp
              </a>
              <Link to="/auth" className="hover:text-primary transition-colors">
                Acessar Painel
              </Link>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-border text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} MenuDigital. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
