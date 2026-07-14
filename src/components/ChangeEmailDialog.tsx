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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Mail } from 'lucide-react';

interface ChangeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentEmail: string | null;
  onSuccess?: () => void;
}

export function ChangeEmailDialog({
  open,
  onOpenChange,
  userId,
  currentEmail,
  onSuccess,
}: ChangeEmailDialogProps) {
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      toast.error('Digite um email válido');
      return;
    }
    if (clean === (currentEmail || '').toLowerCase()) {
      toast.error('O novo email é igual ao atual');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-change-email', {
        body: { userId, newEmail: clean },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Email alterado com sucesso!');
      setNewEmail('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Email change error:', error);
      toast.error(error.message || 'Erro ao alterar email');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNewEmail('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Alterar Email do Lojista
          </DialogTitle>
          <DialogDescription>
            Email atual: <strong className="text-foreground">{currentEmail || 'N/A'}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="newEmail">Novo Email</Label>
            <Input
              id="newEmail"
              type="email"
              placeholder="novo@email.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <p className="text-xs text-muted-foreground">
              O novo email será confirmado automaticamente e o cliente poderá logar com ele imediatamente.
            </p>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Novo Email'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
