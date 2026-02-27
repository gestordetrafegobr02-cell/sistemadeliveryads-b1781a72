import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Store, Utensils, Leaf, Building2, ShoppingBasket } from 'lucide-react';
import { toast } from 'sonner';

interface StoreTemplate {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface CreateStoreManualDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: StoreTemplate[];
  onStoreCreated: () => void;
}

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  'burger-shop': <Utensils className="w-8 h-8" />,
  'acai-shop': <Leaf className="w-8 h-8" />,
  'restaurant': <Building2 className="w-8 h-8" />,
  'grocery': <ShoppingBasket className="w-8 h-8" />,
};

const TEMPLATE_COLORS: Record<string, string> = {
  'burger-shop': 'from-orange-500 to-red-600',
  'acai-shop': 'from-purple-500 to-pink-600',
  'restaurant': 'from-emerald-500 to-teal-600',
  'grocery': 'from-green-500 to-lime-600',
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function CreateStoreManualDialog({
  open,
  onOpenChange,
  templates,
  onStoreCreated,
}: CreateStoreManualDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [trialDays, setTrialDays] = useState('14');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!storeName.trim() || !storeSlug.trim() || !ownerEmail.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(storeSlug)) {
      toast.error('Slug deve conter apenas letras minúsculas, números e hífens');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(ownerEmail)) {
      toast.error('Email inválido');
      return;
    }

    const days = parseInt(trialDays) || 0;

    setCreating(true);
    try {
      const { data, error } = await supabase.rpc('create_store_manual' as never, {
        p_store_name: storeName.trim(),
        p_store_slug: storeSlug.trim().toLowerCase(),
        p_owner_email: ownerEmail.trim().toLowerCase(),
        p_trial_days: days,
        p_template_slug: selectedTemplate || null,
      } as never);

      if (error) throw error;

      toast.success('Loja criada com sucesso!');
      onOpenChange(false);
      resetForm();
      onStoreCreated();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar loja';
      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setSelectedTemplate('');
    setStoreName('');
    setStoreSlug('');
    setOwnerEmail('');
    setTrialDays('14');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Criar Loja Manualmente</DialogTitle>
          <DialogDescription>
            Crie uma loja para um usuário com controle total sobre o período de teste.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Template Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Template (Opcional)</Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setSelectedTemplate('')}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedTemplate === ''
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white mb-3">
                  <Store className="w-6 h-6" />
                </div>
                <h3 className="font-medium">Vazio</h3>
                <p className="text-sm text-muted-foreground">Começar do zero</p>
              </button>
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedTemplate(template.slug)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectedTemplate === template.slug
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-lg bg-gradient-to-br ${
                      TEMPLATE_COLORS[template.slug] || 'from-gray-500 to-gray-600'
                    } flex items-center justify-center text-white mb-3`}
                  >
                    {TEMPLATE_ICONS[template.slug] || <Store className="w-6 h-6" />}
                  </div>
                  <h3 className="font-medium">{template.name}</h3>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Store Details */}
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="storeName">Nome da Loja *</Label>
              <Input
                id="storeName"
                placeholder="Ex: Burger House"
                value={storeName}
                onChange={(e) => {
                  setStoreName(e.target.value);
                  setStoreSlug(generateSlug(e.target.value));
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="storeSlug">Slug (URL) *</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">sistemadeliveryads.site/</span>
                <Input
                  id="storeSlug"
                  placeholder="burger-house"
                  value={storeSlug}
                  onChange={(e) => setStoreSlug(e.target.value.toLowerCase())}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Apenas letras minúsculas, números e hífens.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerEmail">E-mail do Proprietário *</Label>
              <Input
                id="ownerEmail"
                type="email"
                placeholder="lojista@email.com"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                O usuário deve estar cadastrado na plataforma.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trialDays">Dias de Teste</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="trialDays"
                  type="number"
                  min="0"
                  max="365"
                  value={trialDays}
                  onChange={(e) => setTrialDays(e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  {parseInt(trialDays) === 0
                    ? 'Sem período de teste'
                    : `Trial expira em ${trialDays} dias`}
                </span>
              </div>
              <div className="flex gap-2 mt-2">
                {[0, 7, 14, 30].map((days) => (
                  <Button
                    key={days}
                    type="button"
                    size="sm"
                    variant={trialDays === String(days) ? 'default' : 'outline'}
                    onClick={() => setTrialDays(String(days))}
                  >
                    {days === 0 ? 'Nenhum' : `${days}d`}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating || !storeName || !storeSlug || !ownerEmail}
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Criar Loja
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
