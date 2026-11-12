import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Plus, Store, Utensils, Leaf, Building2, ShoppingBasket, Copy, CheckCircle2 } from 'lucide-react';
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
interface CreatedCredentials {
  storeId: string;
  loginEmail: string;
  temporaryPassword: string;
}

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  'burger-shop': <Utensils className="w-8 h-8" />,
  'acai-shop': <Leaf className="w-8 h-8" />,
  restaurant: <Building2 className="w-8 h-8" />,
  grocery: <ShoppingBasket className="w-8 h-8" />,
};
const TEMPLATE_COLORS: Record<string, string> = {
  'burger-shop': 'from-orange-500 to-red-600',
  'acai-shop': 'from-purple-500 to-pink-600',
  restaurant: 'from-emerald-500 to-teal-600',
  grocery: 'from-green-500 to-lime-600',
};
function generateSlug(name: string) {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function CreateStoreManualDialog({ open, onOpenChange, templates, onStoreCreated }: CreateStoreManualDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [trialDays, setTrialDays] = useState('14');
  const [creating, setCreating] = useState(false);
  const [credentials, setCredentials] = useState<CreatedCredentials | null>(null);

  const resetForm = () => {
    setSelectedTemplate('');
    setStoreName('');
    setStoreSlug('');
    setLoginEmail('');
    setTrialDays('14');
    setCredentials(null);
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen && creating) return;
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const handleCreate = async () => {
    const email = loginEmail.trim().toLowerCase();
    if (!storeName.trim() || !storeSlug.trim() || !email) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(storeSlug)) {
      toast.error('O endereço deve usar letras minúsculas, números e hífens');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Digite um e-mail provisório válido');
      return;
    }
    const days = Number(trialDays);
    if (!Number.isInteger(days) || days < 0 || days > 365) {
      toast.error('O período deve ficar entre 0 e 365 dias');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('master-create-store', {
        body: {
          storeName: storeName.trim(),
          storeSlug: storeSlug.trim().toLowerCase(),
          loginEmail: email,
          trialDays: days,
          templateSlug: selectedTemplate || null,
        },
      });
      if (error) throw error;
      if (!data?.success || !data?.temporaryPassword || !data?.storeId) {
        throw new Error(data?.error || 'O servidor não retornou as credenciais da loja');
      }
      setCredentials({
        storeId: data.storeId,
        loginEmail: data.loginEmail,
        temporaryPassword: data.temporaryPassword,
      });
      toast.success('Loja e acesso provisório criados!');
      onStoreCreated();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar loja';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const copyCredentials = async () => {
    if (!credentials) return;
    const text = `DeliveryPro - Acesso inicial\nE-mail: ${credentials.loginEmail}\nSenha provisória: ${credentials.temporaryPassword}\n\nApós entrar, acesse Minha Conta > Segurança da Conta para trocar o e-mail e a senha.`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Credenciais copiadas');
    } catch {
      toast.error('Não foi possível copiar. Selecione e copie os dados manualmente.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {credentials ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" /> Loja criada com sucesso!
              </DialogTitle>
              <DialogDescription>
                A loja já está vinculada a uma conta própria. Guarde estes dados e entregue-os ao cliente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 rounded-xl border p-4">
              <div className="space-y-1">
                <Label>Login provisório</Label>
                <p className="font-mono text-sm break-all">{credentials.loginEmail}</p>
              </div>
              <div className="space-y-1">
                <Label>Senha provisória</Label>
                <p className="font-mono text-sm break-all select-all">{credentials.temporaryPassword}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Oriente o cliente a entrar, abrir Minha Conta → Segurança da Conta, trocar primeiro o e-mail e confirmar o link recebido no novo endereço. Depois, deve trocar a senha. O e-mail provisório precisa ser exclusivo desta conta.
              </p>
              <Button className="w-full gap-2" onClick={copyCredentials}>
                <Copy className="w-4 h-4" /> Copiar dados de acesso
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Concluir</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">Criar Loja Manualmente</DialogTitle>
              <DialogDescription>
                Monte a loja e gere um acesso provisório exclusivo para entregar ao cliente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <Label className="text-base font-medium">Template (Opcional)</Label>
                <div className="grid grid-cols-2 gap-4">
                  <button type="button" onClick={() => setSelectedTemplate('')}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${selectedTemplate === '' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white mb-3">
                      <Store className="w-6 h-6" />
                    </div>
                    <h3 className="font-medium">Vazio</h3>
                    <p className="text-sm text-muted-foreground">Começar do zero</p>
                  </button>
                  {templates.map((template) => (
                    <button key={template.id} type="button" onClick={() => setSelectedTemplate(template.slug)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${selectedTemplate === template.slug ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${TEMPLATE_COLORS[template.slug] || 'from-gray-500 to-gray-600'} flex items-center justify-center text-white mb-3`}>
                        {TEMPLATE_ICONS[template.slug] || <Store className="w-6 h-6" />}
                      </div>
                      <h3 className="font-medium">{template.name}</h3>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="storeName">Nome da Loja *</Label>
                  <Input id="storeName" placeholder="Ex: Burger House" value={storeName}
                    onChange={(e) => { setStoreName(e.target.value); setStoreSlug(generateSlug(e.target.value)); }} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storeSlug">Slug (URL) *</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">cardapioprodigital.shop/</span>
                    <Input id="storeSlug" placeholder="burger-house" value={storeSlug}
                      onChange={(e) => setStoreSlug(e.target.value.toLowerCase())} />
                  </div>
                  <p className="text-xs text-muted-foreground">Apenas letras minúsculas, números e hífens.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loginEmail">E-mail provisório de acesso *</Label>
                  <Input id="loginEmail" type="email" placeholder="entrega+burgerhouse@seudominio.com"
                    value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} autoComplete="off" />
                  <p className="text-xs text-muted-foreground">
                    Use um endereço exclusivo para esta loja. Pode ser um alias (ex.: entrega+nomedaloja@dominio.com), se seu provedor aceitar. O cliente trocará esse e-mail pelo dele depois.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trialDays">Dias de teste</Label>
                  <div className="flex items-center gap-4">
                    <Input id="trialDays" type="number" min="0" max="365" value={trialDays}
                      onChange={(e) => setTrialDays(e.target.value)} className="w-24" />
                    <span className="text-sm text-muted-foreground">
                      {Number(trialDays) === 0 ? 'Sem período de teste' : `Trial expira em ${trialDays} dias`}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[0, 7, 14, 30].map((days) => (
                      <Button key={days} type="button" size="sm"
                        variant={trialDays === String(days) ? 'default' : 'outline'}
                        onClick={() => setTrialDays(String(days))}>
                        {days === 0 ? 'Nenhum' : `${days}d`}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)} disabled={creating}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={creating || !storeName || !storeSlug || !loginEmail}>
                {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando conta e loja...</> :
                  <><Plus className="w-4 h-4 mr-2" /> Criar Loja e Gerar Acesso</>}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
