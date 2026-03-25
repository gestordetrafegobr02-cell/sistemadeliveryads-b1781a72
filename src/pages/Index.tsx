import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { sendLeadNotification } from '@/lib/whatsappLeadNotification';
import { motion } from 'framer-motion';
import { 
  Store, Mail, Lock, ArrowRight, CheckCircle2, Zap,
  Pizza, Leaf, IceCream, UtensilsCrossed,
  ShieldCheck, Smartphone, MessageCircle, QrCode, BarChart3, MapPin, Rocket
} from 'lucide-react';

const NICHE_OPTIONS = [
  { slug: 'burger-shop', name: 'Hamburgueria', icon: UtensilsCrossed, color: 'from-orange-500 to-red-500', description: 'Lanchonetes e fast-food' },
  { slug: 'pizza', name: 'Pizzaria', icon: Pizza, color: 'from-red-500 to-yellow-500', description: 'Pizzas e massas' },
  { slug: 'acai-shop', name: 'Açaiteria', icon: IceCream, color: 'from-purple-500 to-pink-500', description: 'Açaí e sorvetes' },
  { slug: 'grocery', name: 'Hortifruti', icon: Leaf, color: 'from-green-500 to-emerald-500', description: 'Frutas e verduras' },
];

const FEATURES = [
  { icon: ShieldCheck, title: 'Logos Exterminadas', description: 'Zero marca d\'água. Sua loja, sua identidade. 100% white-label.' },
  { icon: Smartphone, title: 'PWA Blindado', description: 'App instalável no celular do cliente com sua marca e ícone.' },
  { icon: MessageCircle, title: 'WhatsApp Procurado', description: 'Pedido direto no WhatsApp com link de rastreio automático.' },
  { icon: QrCode, title: 'Pix Automático', description: 'Chave Pix integrada. Cliente paga, você recebe. Sem intermediário.' },
  { icon: BarChart3, title: 'Dashboard Real-time', description: 'Faturamento, pedidos e métricas atualizando ao vivo no painel.' },
  { icon: MapPin, title: 'Rastreio de Pedido', description: 'Cliente acompanha o status em tempo real pelo link exclusivo.' },
];

/* Floating element for background decoration */
function FloatingElement({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -20, 0], rotate: [0, 5, -5, 0] }}
      transition={{ duration: 6, repeat: Infinity, delay, ease: 'easeInOut' }}
    />
  );
}

export default function Index() {
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedNiche, setSelectedNiche] = useState('burger-shop');
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth' });

  const generateSlug = (name: string) => {
    const base = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `${base}-${Date.now().toString(36).slice(-4)}`;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !email.trim() || !password.trim()) { toast({ title: 'Preencha todos os campos', variant: 'destructive' }); return; }
    if (password.length < 6) { toast({ title: 'A senha deve ter pelo menos 6 caracteres', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Erro ao criar conta');
      const slug = generateSlug(storeName.trim());
      const { data: storeId, error: storeError } = await supabase.rpc('create_user_store_with_template', { p_store_name: storeName.trim(), p_store_slug: slug, p_template_slug: selectedNiche });
      if (storeError) throw storeError;
      const sevenDaysFromNow = new Date(); sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      await supabase.from('stores').update({ trial_expires_at: sevenDaysFromNow.toISOString() }).eq('id', storeId);
      const nicheLabel = NICHE_OPTIONS.find(n => n.slug === selectedNiche)?.name || 'Outro';
      toast({ title: '🎉 Loja criada com sucesso!', description: 'Você tem 7 dias grátis para testar.' });
      sendLeadNotification({ storeName: storeName.trim(), email: email.trim(), segment: nicheLabel }).catch(console.error);
      navigate('/admin');
    } catch (error: any) {
      console.error('Signup error:', error);
      let message = 'Erro ao criar conta. Tente novamente.';
      if (error.message?.includes('already registered')) message = 'Este e-mail já está cadastrado. Faça login.';
      toast({ title: message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return (
    <div className="landing-black min-h-screen bg-[#000000] text-white overflow-hidden relative">
      {/* Grid texture background */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
        backgroundSize: '60px 60px'
      }} />
      {/* Radial glow */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        background: 'radial-gradient(ellipse 80% 50% at 50% 20%, rgba(30,64,175,0.15), transparent)'
      }} />

      {/* Floating 3D elements */}
      <FloatingElement delay={0} className="absolute top-[15%] left-[8%] w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600/20 to-blue-400/5 border border-blue-500/10 backdrop-blur-sm z-0 hidden md:block" />
      <FloatingElement delay={1.5} className="absolute top-[30%] right-[10%] w-12 h-12 rounded-full bg-gradient-to-br from-purple-600/20 to-purple-400/5 border border-purple-500/10 backdrop-blur-sm z-0 hidden md:block" />
      <FloatingElement delay={3} className="absolute top-[60%] left-[5%] w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600/20 to-cyan-400/5 border border-cyan-500/10 backdrop-blur-sm z-0 hidden md:block" />
      <FloatingElement delay={2} className="absolute top-[75%] right-[15%] w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600/20 to-indigo-400/5 border border-indigo-500/10 backdrop-blur-sm z-0 hidden md:block" />

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-black/70 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <span className="text-sm font-bold tracking-widest text-white/60 uppercase">V100</span>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" className="text-white/60 hover:text-white hover:bg-white/5">Entrar</Button>
            </Link>
            <Button onClick={scrollToForm} className="bg-blue-600 hover:bg-blue-700 text-white hidden sm:flex">
              Começar Grátis
            </Button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="relative z-10 max-w-5xl mx-auto px-4 md:px-6 pt-20 md:pt-32 pb-20 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-sm font-medium mb-8">
            <Zap className="w-4 h-4" /> Zero taxas por pedido
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight mb-6 leading-[1.05]">
            A BLINDAGEM DO SEU{' '}
            <br className="hidden sm:block" />
            DELIVERY COM O{' '}
            <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-blue-700 bg-clip-text text-transparent">
              SISTEMA V100
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            Cardápio premium, rastreio em tempo real e pedidos no WhatsApp.
            <strong className="text-white/80"> Sem comissão. Sem iFood.</strong> 100% sua marca.
          </p>

          <Button
            size="lg"
            onClick={scrollToForm}
            className="h-14 px-8 text-lg bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-[0_0_40px_rgba(37,99,235,0.3)] animate-[pulse_3s_ease-in-out_infinite]"
          >
            QUERO MEU CARDÁPIO PREMIUM AGORA
            <Rocket className="w-5 h-5" />
          </Button>

          <p className="text-sm text-white/30 mt-6">
            ✓ 7 dias grátis &nbsp;&nbsp; ✓ Sem cartão de crédito &nbsp;&nbsp; ✓ Cancele quando quiser
          </p>
        </motion.div>
      </header>

      {/* FEATURE CARDS - Glassmorphism */}
      <section className="relative z-10 py-20 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400 text-sm font-medium mb-4">
              Funcionalidades Blindadas
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4">
              Tudo que seu delivery precisa.
              <br className="hidden sm:block" />
              <span className="text-white/40">Nada que ele não precisa.</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group p-7 rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-md hover:border-blue-500/30 hover:bg-white/[0.06] transition-all duration-500"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-5 group-hover:bg-blue-600/20 transition-colors">
                  <f.icon className="w-6 h-6 text-blue-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Separator */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            Pronto para <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">blindar</span> seu delivery?
          </h2>
          <p className="text-white/40 mb-8">Junte-se a centenas de lojas que faturam mais sem pagar comissão.</p>
          <Button size="lg" onClick={scrollToForm} className="h-14 px-8 text-lg bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-[0_0_40px_rgba(37,99,235,0.3)]">
            COMEÇAR MEU TESTE GRÁTIS <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* SIGNUP FORM */}
      <section ref={formRef} className="relative z-10 py-20 pb-32 px-4 md:px-6">
        <div className="max-w-lg mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="rounded-3xl p-8 md:p-10 border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-2xl"
          >
            <div className="text-center mb-8">
              <span className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-4">
                🎁 7 dias grátis
              </span>
              <h3 className="text-2xl font-bold text-white mb-2">Crie sua loja agora</h3>
              <p className="text-white/40">Setup em menos de 5 minutos</p>
            </div>

            <form onSubmit={handleSignup} className="space-y-5">
              <div className="space-y-3">
                <Label className="text-white/60 font-medium">Tipo do seu negócio</Label>
                <div className="grid grid-cols-2 gap-3">
                  {NICHE_OPTIONS.map((niche) => {
                    const IconComponent = niche.icon;
                    const isSelected = selectedNiche === niche.slug;
                    return (
                      <button key={niche.slug} type="button" onClick={() => setSelectedNiche(niche.slug)}
                        className={`relative p-4 rounded-xl border transition-all duration-200 text-left ${
                          isSelected
                            ? 'border-blue-500/50 bg-blue-500/10 shadow-[0_0_20px_rgba(37,99,235,0.1)]'
                            : 'border-white/[0.08] hover:border-white/20 bg-white/[0.02]'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${niche.color} flex items-center justify-center mb-2`}>
                          <IconComponent className="w-5 h-5 text-white" />
                        </div>
                        <p className={`font-semibold text-sm ${isSelected ? 'text-blue-400' : 'text-white/80'}`}>{niche.name}</p>
                        <p className="text-xs text-white/30 mt-0.5">{niche.description}</p>
                        {isSelected && <div className="absolute top-2 right-2"><CheckCircle2 className="w-5 h-5 text-blue-400" /></div>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="storeName" className="text-white/60 font-medium">Nome da sua Loja</Label>
                <div className="relative">
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                  <Input id="storeName" type="text" placeholder="Ex: Burger do João" value={storeName} onChange={(e) => setStoreName(e.target.value)}
                    className="pl-12 h-12 bg-white/[0.04] border-white/[0.08] focus:border-blue-500/50 focus:ring-blue-500/20 rounded-xl text-white placeholder:text-white/20" maxLength={100} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/60 font-medium">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                  <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-12 bg-white/[0.04] border-white/[0.08] focus:border-blue-500/50 focus:ring-blue-500/20 rounded-xl text-white placeholder:text-white/20" maxLength={255} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/60 font-medium">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                  <Input id="password" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 h-12 bg-white/[0.04] border-white/[0.08] focus:border-blue-500/50 focus:ring-blue-500/20 rounded-xl text-white placeholder:text-white/20" minLength={6} />
                </div>
              </div>

              <Button type="submit" disabled={loading}
                className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-[0_0_30px_rgba(37,99,235,0.25)]">
                {loading ? 'Criando sua loja...' : 'Começar meu Teste Grátis'}
              </Button>
            </form>

            <p className="text-xs text-white/20 text-center mt-6">
              Após 7 dias, apenas R$ 97/mês. Cancele quando quiser.
            </p>
          </motion.div>

          <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-8 mt-8 text-sm text-white/30">
            {['Setup em 5 min', 'Sem taxas ocultas', 'Cancele quando quiser'].map((item, idx) => (
              <div key={idx} className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400/60" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-4 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-center">
          <p className="text-sm text-white/20">© {new Date().getFullYear()} Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
