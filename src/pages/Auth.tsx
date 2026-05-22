import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { z } from 'zod';

import { Loader2, Mail, Lock } from 'lucide-react';
import authBurger from '@/assets/auth-burger.jpg';
import authPizza from '@/assets/auth-pizza.jpg';
import authAcai from '@/assets/auth-acai.jpg';
import authDelivery from '@/assets/auth-delivery.jpg';
import authIngredients from '@/assets/auth-ingredients.jpg';
import authFries from '@/assets/auth-fries.jpg';
import demoBurger from '@/assets/demo-burger.jpg';
import demoPizza from '@/assets/demo-pizza.jpg';
import demoAcai from '@/assets/demo-acai.jpg';
import demoHortifruti from '@/assets/demo-hortifruti.jpg';

const FOOD_IMAGES = [
  authBurger, authPizza, authAcai, authDelivery, authIngredients, authFries,
  demoBurger, demoPizza, demoAcai, demoHortifruti,
];

// Build 4 shuffled columns for parallax scroll
const buildColumn = (offset: number) => {
  const arr = [...FOOD_IMAGES];
  // simple rotation per column for variety
  return [...arr.slice(offset), ...arr.slice(0, offset)];
};
const COLUMNS = [buildColumn(0), buildColumn(3), buildColumn(6), buildColumn(8)];

const authSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});


export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkingStore, setCheckingStore] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      checkUserAccess();
    }
  }, [user, loading]);

  async function checkUserAccess() {
    if (!user) return;
    
    setCheckingStore(true);
    
    // Check if user is master admin - redirect directly to super-admin
    // Master admin bypasses all other checks
    const isMasterAdmin = user.email === 'igormoises.ads@gmail.com';
    if (isMasterAdmin) {
      navigate('/super-admin', { replace: true });
      setCheckingStore(false);
      return;
    }
    
    // Check if user has admin role - redirect to super-admin
    const { data: roleData } = await supabase.rpc('is_admin');
    if (roleData === true) {
      navigate('/super-admin', { replace: true });
      setCheckingStore(false);
      return;
    }
    
    // For regular users, check if they have a store
    const { data } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (data) {
      navigate('/admin', { replace: true });
    } else {
      navigate('/onboarding', { replace: true });
    }
    setCheckingStore(false);
  }

  const handleSubmit = async (type: 'login' | 'signup') => {
    setError('');
    
    const result = authSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setSubmitting(true);

    if (type === 'signup') {
      const { error } = await signUp(email, password);
      if (error) {
        if (error.message.includes('already registered')) {
          setError('Este email já está cadastrado');
        } else {
          setError(error.message);
        }
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login')) {
          setError('Email ou senha incorretos');
        } else {
          setError(error.message);
        }
      }
    }

    setSubmitting(false);
  };

  if (loading || checkingStore) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-accent blur-xl opacity-50 animate-pulse" />
          <Loader2 className="w-10 h-10 animate-spin text-primary relative z-10" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-black">
      {/* Keyframes for Netflix-style infinite scroll */}
      <style>{`
        @keyframes auth-scroll-up {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(0, -50%, 0); }
        }
        @keyframes auth-scroll-down {
          0% { transform: translate3d(0, -50%, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
        .auth-col-up { animation: auth-scroll-up 60s linear infinite; }
        .auth-col-down { animation: auth-scroll-down 75s linear infinite; }
        .auth-col-up-fast { animation: auth-scroll-up 50s linear infinite; }
        .auth-col-down-slow { animation: auth-scroll-down 85s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .auth-col-up, .auth-col-down, .auth-col-up-fast, .auth-col-down-slow { animation: none; }
        }
      `}</style>

      {/* Netflix-style scrolling food image grid */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-3 opacity-90">
          {COLUMNS.map((col, i) => {
            const animClass = ['auth-col-up', 'auth-col-down', 'auth-col-up-fast', 'auth-col-down-slow'][i % 4];
            const hideClass = i === 2 ? 'hidden sm:flex' : i === 3 ? 'hidden md:flex' : 'flex';
            return (
              <div key={i} className={`${hideClass} flex-col overflow-hidden`}>
                <div className={`flex flex-col gap-3 ${animClass}`}>
                  {[...col, ...col].map((src, idx) => (
                    <div
                      key={idx}
                      className="w-full aspect-[3/4] rounded-2xl overflow-hidden flex-shrink-0 bg-slate-900"
                    >
                      <img
                        src={src}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Heavy backdrop blur + dark premium gradient overlay */}
        <div
          className="absolute inset-0"
          style={{ backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/70 to-black/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,0,0,0.3)_0%,_rgba(0,0,0,0.85)_85%)]" />

        {/* Premium ambient accents */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-primary/20 to-accent/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-gradient-to-tr from-accent/15 to-primary/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>


      {/* Glassmorphism Card */}
      <div className="relative z-10 w-full max-w-md">
        <div 
          className="rounded-2xl border border-white/10 p-8 shadow-2xl"
          style={{
            background: 'rgba(10, 10, 12, 0.72)',
            backdropFilter: 'blur(28px) saturate(140%)',
            WebkitBackdropFilter: 'blur(28px) saturate(140%)',
            boxShadow: '0 30px 80px -20px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.06) inset'
          }}
        >
          {/* Welcome Text */}
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl tracking-wide text-slate-100">
              Sistema Delivery ADS
            </h1>
            <p className="text-slate-400 mt-2 text-sm">
              Acesse sua conta para gerenciar sua loja
            </p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 border border-slate-700 rounded-xl p-1 mb-6">
              <TabsTrigger 
                value="login" 
                className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300"
              >
                Entrar
              </TabsTrigger>
              <TabsTrigger 
                value="signup"
                className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300"
              >
                Criar Conta
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-slate-300 text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="pl-10 bg-slate-800/50 border-slate-700 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300 rounded-xl h-12 text-slate-100 placeholder:text-slate-400"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-slate-300 text-sm font-medium">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 bg-slate-800/50 border-slate-700 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300 rounded-xl h-12 text-slate-100 placeholder:text-slate-400"
                  />
                </div>
              </div>
              
              {error && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                  {error}
                </div>
              )}

              <Button
                onClick={() => handleSubmit('login')}
                disabled={submitting}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50 disabled:hover:scale-100"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Acessar Painel'
                )}
              </Button>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-slate-300 text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="pl-10 bg-slate-800/50 border-slate-700 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300 rounded-xl h-12 text-slate-100 placeholder:text-slate-400"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-slate-300 text-sm font-medium">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="pl-10 bg-slate-800/50 border-slate-700 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300 rounded-xl h-12 text-slate-100 placeholder:text-slate-400"
                  />
                </div>
              </div>
              
              {error && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                  {error}
                </div>
              )}

              <Button
                onClick={() => handleSubmit('signup')}
                disabled={submitting}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50 disabled:hover:scale-100"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Criar Minha Conta'
                )}
              </Button>

              <p className="text-xs text-center text-slate-400 mt-4">
                Ao criar sua conta, você concorda com nossos Termos de Uso
              </p>
            </TabsContent>
          </Tabs>
        </div>

        {/* Bottom decorative line */}
        <div className="mt-8 flex items-center justify-center gap-2 text-slate-500 text-xs">
          <div className="w-12 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <span>Sistema de Delivery Inteligente</span>
          <div className="w-12 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </div>
      </div>
    </div>
  );
}
