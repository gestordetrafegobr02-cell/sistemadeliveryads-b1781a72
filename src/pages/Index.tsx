import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MenuShowcase } from '@/components/landing/MenuShowcase';
import { 
  TrendingUp, 
  ShoppingCart, 
  BarChart3, 
  Store,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2
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
      icon: TrendingUp,
      title: 'Venda Mais',
      description: 'Upsell automático de acompanhamentos e bebidas no momento certo da compra.',
    },
    {
      icon: ShoppingCart,
      title: 'Recupere Clientes',
      description: 'Abas de carrinhos abandonados prontas para ação via WhatsApp.',
    },
    {
      icon: BarChart3,
      title: 'Gestão Total',
      description: 'Controle de trial e relatórios simples para decisões inteligentes.',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="max-w-6xl mx-auto px-4 md:px-6 py-6 flex items-center justify-between">
        <span className="font-semibold text-xl text-neutral-900">
          Menu<span className="text-primary">Digital</span>
        </span>
        <Link to="/auth">
          <Button variant="ghost" className="text-neutral-600 hover:text-neutral-900">
            Entrar
          </Button>
        </Link>
      </nav>

      {/* Hero Section */}
      <header className="max-w-4xl mx-auto px-4 md:px-6 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-100 text-neutral-600 text-sm mb-8">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          7 dias grátis • Sem cartão de crédito
        </div>
        
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold text-neutral-900 tracking-tight mb-6 leading-[1.1]">
          O cardápio digital que<br />
          <span className="text-primary">entende o seu negócio</span>
        </h1>
        
        <p className="text-lg md:text-xl text-neutral-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Seja uma hamburgueria, açaiteria ou hortifruti: venda mais com upsell inteligente e gestão profissional.
        </p>

        <Button 
          size="lg"
          onClick={scrollToForm}
          className="h-14 px-8 text-lg bg-primary hover:bg-primary/90 text-white gap-2"
        >
          Começar Teste Grátis
          <ArrowRight className="w-5 h-5" />
        </Button>
      </header>

      {/* Menu Showcase Section */}
      <section className="py-20 bg-neutral-50">
        <div className="max-w-6xl mx-auto px-4 md:px-6 mb-12 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold text-neutral-900 mb-4">
            Modelos prontos para seu segmento
          </h2>
          <p className="text-neutral-500 text-lg max-w-xl mx-auto">
            Templates profissionais que você personaliza em minutos
          </p>
        </div>
        
        <MenuShowcase />
      </section>

      {/* Features Grid */}
      <section className="py-24 px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-neutral-900 mb-4">
              Tudo que você precisa
            </h2>
            <p className="text-neutral-500 text-lg">
              Funcionalidades simples e poderosas para seu delivery
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-5">
                  <feature.icon className="w-7 h-7 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-medium text-neutral-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-neutral-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Signup Form */}
      <section ref={formRef} className="py-24 px-4 md:px-6 bg-neutral-50">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl p-8 md:p-10 shadow-sm border border-neutral-200">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-semibold text-neutral-900 mb-2">
                Crie sua loja agora
              </h3>
              <p className="text-neutral-500">
                <span className="text-green-600 font-medium">7 dias grátis</span> • Sem compromisso
              </p>
            </div>

            <form onSubmit={handleSignup} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="storeName" className="text-neutral-700">Nome da sua Loja</Label>
                <div className="relative">
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <Input
                    id="storeName"
                    type="text"
                    placeholder="Ex: Burger do João"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="pl-12 h-12 bg-white border-neutral-200 focus:border-primary focus:ring-primary rounded-xl"
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-neutral-700">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-12 bg-white border-neutral-200 focus:border-primary focus:ring-primary rounded-xl"
                    maxLength={255}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-neutral-700">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 h-12 bg-white border-neutral-200 focus:border-primary focus:ring-primary rounded-xl"
                    minLength={6}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-12 text-base bg-primary hover:bg-primary/90 text-white rounded-xl"
              >
                {loading ? 'Criando sua loja...' : 'Começar meu Teste Grátis'}
              </Button>
            </form>

            <p className="text-xs text-neutral-400 text-center mt-6">
              Ao criar sua conta, você concorda com nossos Termos de Uso e Política de Privacidade.
            </p>
          </div>

          {/* Trust Signals */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-8 mt-8 text-sm text-neutral-500">
            {['Setup em 2 min', 'Sem taxas ocultas', 'Cancele quando quiser'].map((item, idx) => (
              <div key={idx} className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 md:px-6 border-t border-neutral-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-semibold text-lg text-neutral-900">
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
