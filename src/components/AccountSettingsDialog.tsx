import { useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, Mail, KeyRound, ShieldCheck } from 'lucide-react';

interface AccountSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string | null | undefined;
}

export function AccountSettingsDialog({
  open,
  onOpenChange,
  currentEmail,
}: AccountSettingsDialogProps) {
  const [tab, setTab] = useState<'email' | 'password'>('email');

  // Shared reauth
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);

  // Email
  const [newEmail, setNewEmail] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);

  // Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [loadingPass, setLoadingPass] = useState(false);

  const reauth = async () => {
    if (!currentEmail) throw new Error('Email atual não encontrado');
    if (!currentPassword) throw new Error('Digite sua senha atual');
    const { error } = await supabase.auth.signInWithPassword({
      email: currentEmail,
      password: currentPassword,
    });
    if (error) throw new Error('Senha atual incorreta');
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Digite um email válido');
      return;
    }
    if (email === (currentEmail || '').toLowerCase()) {
      toast.error('O novo email deve ser diferente do atual');
      return;
    }
    setLoadingEmail(true);
    try {
      await reauth();
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      toast.success(
        'Confirmação enviada! Verifique o novo email e clique no link para concluir a troca.',
        { duration: 8000 }
      );
      setNewEmail('');
      setCurrentPassword('');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar email');
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('A nova senha deve ter pelo menos 8 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (newPassword === currentPassword) {
      toast.error('A nova senha deve ser diferente da atual');
      return;
    }
    setLoadingPass(true);
    try {
      await reauth();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar senha');
    } finally {
      setLoadingPass(false);
    }
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewEmail('');
    setNewPassword('');
    setConfirmPassword('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Segurança da Conta
          </DialogTitle>
          <DialogDescription>
            Conta atual: <strong className="text-foreground">{currentEmail || 'N/A'}</strong>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'email' | 'password')} className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="email" className="gap-2">
              <Mail className="w-4 h-4" /> Email
            </TabsTrigger>
            <TabsTrigger value="password" className="gap-2">
              <KeyRound className="w-4 h-4" /> Senha
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email">
            <form onSubmit={handleChangeEmail} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="newEmail">Novo email</Label>
                <Input
                  id="newEmail"
                  type="email"
                  placeholder="seunovo@email.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="curPassEmail">Senha atual (para confirmar)</Label>
                <div className="relative">
                  <Input
                    id="curPassEmail"
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Você receberá um link de confirmação no novo email. A troca só é concluída após clicar no link.
              </p>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose} disabled={loadingEmail}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loadingEmail}>
                  {loadingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...
                    </>
                  ) : (
                    'Alterar email'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="password">
            <form onSubmit={handleChangePassword} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="curPass">Senha atual</Label>
                <div className="relative">
                  <Input
                    id="curPass"
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPass">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="newPass"
                    type={showNew ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confPass">Confirmar nova senha</Label>
                <Input
                  id="confPass"
                  type={showNew ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose} disabled={loadingPass}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loadingPass}>
                  {loadingPass ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...
                    </>
                  ) : (
                    'Alterar senha'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
