import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Store, ArrowRight, ArrowLeft, Check, Sparkles, Settings, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { sendLeadNotification } from '@/lib/whatsappLeadNotification';

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
  { slug: 'burger-shop', name: 'Hamburgueria', description: 'Combos, Artesanais, Bebidas', icon: '🍔' },
  { slug: 'acai-shop', name: 'Açaiteria', description: 'Copos, Adicionais, Cremes', icon: '🍧' },
  { slug: 'pizza', name: 'Pizzaria', description: 'Tradicionais, Premium, Bebidas', icon: '🍕' },
  { slug: 'grocery', name: 'Hortifruti', description: 'Frutas, Verduras, Mercearia', icon: '🍎' },
  { slug: 'empty', name: 'Cardápio Vazio', description: 'Comece do zero', icon: '📝' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [hasStore, setHasStore] = useState<boolean | null>(null);
  const [isEmptyStore, setIsEmptyStore] = useState(false);
  const [createdNiche, setCreatedNiche] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; slug?: string }>({});

  // Check if we're in quick-setup mode (existing empty store)
  const quickSetup = searchParams.get('quick-setup') === 'true';

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
    const { data: storeData } = await supabase
      .from('stores')
      .select('id, name, slug')
      .eq('owner_id', user!.id)
      .maybeSingle();

    if (storeData) {
      // User has a store - check if it's empty
      const { count: categoriesCount } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeData.id);

      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeData.id);

      if ((categoriesCount === 0 || categoriesCount === null) && 
          (productsCount === 0 || productsCount === null)) {
        // Empty store - show quick setup
        setIsEmptyStore(true);
        setHasStore(true);
        setStoreName(storeData.name);
        setStoreSlug(storeData.slug);
        setStep(2); // Skip to template selection
      } else if (quickSetup) {
        // Already has products, redirect to admin
        navigate('/admin');
      } else {
        // Store has products, go to admin
        navigate('/admin');
      }
    } else {
      setHasStore(false);
    }
  }

  function handleNameChange(value: string) {
    setStoreName(value);
    // Generate base slug from name
    let baseSlug = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Add a unique suffix (timestamp-based) to avoid collisions
    const uniqueSuffix = Date.now().toString(36).slice(-4);
    const uniqueSlug = baseSlug ? `${baseSlug}-${uniqueSuffix}` : '';
    
    setStoreSlug(uniqueSlug);
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
      if (isEmptyStore) {
        // Existing empty store - just add template data
        const { data: storeData } = await supabase
          .from('stores')
          .select('id')
          .eq('owner_id', user!.id)
          .single();

        if (!storeData) {
          toast.error('Loja não encontrada');
          return;
        }

        if (selectedTemplate !== 'empty') {
          // Get template data
          const { data: template } = await supabase
            .from('store_templates')
            .select('categories, products')
            .eq('slug', selectedTemplate)
            .single();

          if (template) {
            const categoryMap: Record<string, string> = {};
            const categories = template.categories as Array<{ name: string; sort_order: number }>;
            const products = template.products as Array<{ name: string; description: string; price: number; category: string }>;

            // Create categories
            for (const cat of categories) {
              const { data: newCat } = await supabase
                .from('categories')
                .insert({ store_id: storeData.id, name: cat.name, sort_order: cat.sort_order })
                .select('id')
                .single();
              if (newCat) {
                categoryMap[cat.name] = newCat.id;
              }
            }

            // Create products
            for (const prod of products) {
              await supabase.from('products').insert({
                store_id: storeData.id,
                name: prod.name,
                description: prod.description,
                price: prod.price,
                category_id: categoryMap[prod.category] || null,
                is_available: true,
              });
            }
          }
        }

        setCreatedNiche(TEMPLATES.find(t => t.slug === selectedTemplate)?.name || 'seu negócio');
        setStep(3);
        
        // Send WhatsApp notification for existing store template setup (fire and forget)
        sendLeadNotification({
          storeName: storeName,
          email: user?.email || 'Não informado',
          segment: TEMPLATES.find(t => t.slug === selectedTemplate)?.name || 'Não informado',
        }).catch(console.error);
      } else {
        // Create new store with template
        const { error } = await supabase.rpc('create_user_store_with_template', {
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

        setCreatedNiche(TEMPLATES.find(t => t.slug === selectedTemplate)?.name || 'seu negócio');
        setStep(3);
        
        // Send WhatsApp notification for new store creation (fire and forget)
        sendLeadNotification({
          storeName: storeName.trim(),
          email: user?.email || 'Não informado',
          segment: TEMPLATES.find(t => t.slug === selectedTemplate)?.name || 'Não informado',
        }).catch(console.error);
      }
    } catch (err) {
      toast.error('Erro inesperado ao criar loja');
    } finally {
      setCreating(false);
    }
  }

  if (authLoading || (hasStore === null && !quickSetup)) {
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
          {[1, 2, 3].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                step >= s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
              }`}>
                {step > s ? <Check className="w-5 h-5" /> : s}
              </div>
              {i < 2 && (
                <div className={`w-12 h-1 rounded mx-2 ${step > s ? 'bg-primary' : 'bg-secondary'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Store Info (skip if quick-setup) */}
        {step === 1 && !isEmptyStore && (
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

        {/* Step 2: Template Selection */}
        {step === 2 && (
          <Card className="bg-card border-border animate-fade-in">
            <CardHeader className="text-center">
              <Sparkles className="w-12 h-12 mx-auto text-primary mb-2" />
              <CardTitle className="font-display text-2xl">
                {isEmptyStore ? 'Configuração Rápida' : 'Escolha seu Tipo de Negócio'}
              </CardTitle>
              <CardDescription>
                {isEmptyStore 
                  ? 'Sua loja está vazia! Escolha um modelo para começar rapidamente'
                  : 'Começaremos com um cardápio pronto para você personalizar'}
              </CardDescription>
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
                  onClick={() => {
                    if (isEmptyStore) {
                      navigate('/admin');
                    } else {
                      setStep(1);
                    }
                  }}
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
                      {isEmptyStore ? 'Aplicando...' : 'Criando...'}
                    </>
                  ) : (
                    <>
                      {isEmptyStore ? 'Aplicar Template' : 'Criar Loja'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Success Tutorial */}
        {step === 3 && (
          <Card className="bg-card border-border animate-fade-in">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <CardTitle className="font-display text-2xl">
                🎉 Seu cardápio de {createdNiche} está pronto!
              </CardTitle>
              <CardDescription>
                Siga os próximos passos para começar a vender
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tutorial Steps */}
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-secondary/50">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="font-bold text-primary">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Cardápio pronto!</h4>
                    <p className="text-sm text-muted-foreground">
                      Seu cardápio de {createdNiche} já está configurado com produtos de exemplo.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-secondary/50">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Settings className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Altere os preços</h4>
                    <p className="text-sm text-muted-foreground">
                      Acesse a aba "Produtos" para ajustar nomes, descrições e preços.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-secondary/50">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Configure seu PIX</h4>
                    <p className="text-sm text-muted-foreground">
                      Adicione sua chave PIX e WhatsApp na aba "Loja" para receber pagamentos.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => navigate('/admin')}
                className="w-full btn-glow bg-primary text-primary-foreground gap-2"
              >
                Ir para o Painel
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
