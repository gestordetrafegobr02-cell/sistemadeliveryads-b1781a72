import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Store, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const storeSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  slug: z.string().trim().min(3, 'Slug deve ter pelo menos 3 caracteres').max(50, 'Slug muito longo')
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
});

interface Template {
  slug: string;
  name: string;
  description: string;
  icon: string;
}

const TEMPLATES: Template[] = [
  { slug: 'burger-shop', name: 'Hamburgueria', description: 'Combos, Burgers, Acompanhamentos', icon: '🍔' },
  { slug: 'acai-shop', name: 'Açaiteria', description: 'Tigelas, Toppings, Cremes', icon: '🍧' },
  { slug: 'restaurant', name: 'Restaurante', description: 'Pratos do Dia, Executivos', icon: '🍽️' },
  { slug: 'grocery', name: 'Hortifruti', description: 'Frutas, Legumes, Laticínios', icon: '🍎' },
  { slug: 'empty', name: 'Cardápio Vazio', description: 'Comece do zero', icon: '📝' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [hasStore, setHasStore] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<{ name?: string; slug?: string }>({});

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      checkExistingStore();
    }
  }, [user]);

  async function checkExistingStore() {
    const { data } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', user!.id)
      .maybeSingle();

    if (data) {
      navigate('/admin');
    } else {
      setHasStore(false);
    }
  }

  function handleNameChange(value: string) {
    setStoreName(value);
    // Auto-generate slug from name
    const slug = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setStoreSlug(slug);
    setErrors({});
  }

  function validateStep1(): boolean {
    const result = storeSchema.safeParse({ name: storeName, slug: storeSlug });
    if (!result.success) {
      const fieldErrors: { name?: string; slug?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'name') fieldErrors.name = err.message;
        if (err.path[0] === 'slug') fieldErrors.slug = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  }

  async function handleCreateStore() {
    if (!selectedTemplate) {
      toast.error('Selecione um tipo de negócio');
      return;
    }

    setCreating(true);

    try {
      const { data, error } = await supabase.rpc('create_user_store_with_template', {
        p_store_name: storeName.trim(),
        p_store_slug: storeSlug.trim().toLowerCase(),
        p_template_slug: selectedTemplate,
      });

      if (error) {
        if (error.message.includes('already in use') || error.message.includes('Slug')) {
          toast.error('Este slug já está em uso. Escolha outro.');
        } else if (error.message.includes('already has a store')) {
          toast.error('Você já possui uma loja.');
          navigate('/admin');
        } else {
          toast.error('Erro ao criar loja: ' + error.message);
        }
        return;
      }

      toast.success('Loja criada com sucesso! 🎉');
      navigate('/admin');
    } catch (err) {
      toast.error('Erro inesperado ao criar loja');
    } finally {
      setCreating(false);
    }
  }

  if (authLoading || hasStore === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
            {step > 1 ? <Check className="w-5 h-5" /> : '1'}
          </div>
          <div className={`w-16 h-1 rounded ${step >= 2 ? 'bg-primary' : 'bg-secondary'}`} />
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
            2
          </div>
        </div>

        {step === 1 && (
          <Card className="bg-card border-border animate-fade-in">
            <CardHeader className="text-center">
              <Store className="w-12 h-12 mx-auto text-primary mb-2" />
              <CardTitle className="font-display text-2xl">Configure sua Loja</CardTitle>
              <CardDescription>Escolha um nome e slug para sua loja</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="storeName">Nome da Loja</Label>
                <Input
                  id="storeName"
                  value={storeName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ex: Burger House"
                  className="bg-secondary border-border"
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="storeSlug">Slug (URL)</Label>
                <Input
                  id="storeSlug"
                  value={storeSlug}
                  onChange={(e) => {
                    setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                    setErrors({});
                  }}
                  placeholder="burger-house"
                  className="bg-secondary border-border"
                />
                <p className="text-xs text-muted-foreground">
                  Sua loja ficará em: /shop/{storeSlug || 'seu-slug'}
                </p>
                {errors.slug && <p className="text-sm text-destructive">{errors.slug}</p>}
              </div>

              <Button
                onClick={() => {
                  if (validateStep1()) setStep(2);
                }}
                className="w-full btn-glow bg-primary text-primary-foreground gap-2"
              >
                Continuar
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="bg-card border-border animate-fade-in">
            <CardHeader className="text-center">
              <CardTitle className="font-display text-2xl">Escolha seu Tipo de Negócio</CardTitle>
              <CardDescription>Começaremos com um cardápio pronto para você personalizar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.slug}
                    onClick={() => setSelectedTemplate(template.slug)}
                    className={`p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
                      selectedTemplate === template.slug
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-secondary/50 hover:border-primary/50'
                    }`}
                  >
                    <span className="text-4xl block mb-2">{template.icon}</span>
                    <h3 className="font-semibold text-foreground">{template.name}</h3>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                    {selectedTemplate === template.slug && (
                      <Check className="w-5 h-5 text-primary mt-2" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </Button>
                <Button
                  onClick={handleCreateStore}
                  disabled={!selectedTemplate || creating}
                  className="flex-1 btn-glow bg-primary text-primary-foreground gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      Criar Loja
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
