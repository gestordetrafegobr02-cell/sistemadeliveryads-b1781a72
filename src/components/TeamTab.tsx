import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserPlus, Trash2, Copy, Users, Share2 } from 'lucide-react';
import { SITE_URL } from '@/lib/siteConfig';
import { toast } from 'sonner';

type Role = 'manager' | 'attendant' | 'kitchen';

interface Member {
  id: string;
  user_id: string;
  email: string | null;
  role: Role | 'owner';
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Dono',
  manager: 'Gerente',
  attendant: 'Atendente',
  kitchen: 'Cozinha',
};

const ROLE_HINT: Record<Role, string> = {
  manager: 'Gerencia loja, produtos e pedidos (não gerencia equipe).',
  attendant: 'Vê e atualiza somente pedidos.',
  kitchen: 'Vê e imprime pedidos para a cozinha.',
};

export function TeamTab({ storeId }: { storeId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('attendant');
  const [inviting, setInviting] = useState(false);
  const [tempCred, setTempCred] = useState<{ email: string; password: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('list_store_members', { p_store_id: storeId });
    if (error) toast.error(error.message);
    setMembers((data as Member[]) || []);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      toast.error('Digite um email válido');
      return;
    }
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-store-member', {
        body: { storeId, email: em, role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.tempPassword) {
        setTempCred({ email: em, password: data.tempPassword });
        toast.success('Usuário criado! Envie a senha temporária ao membro.');
      } else {
        toast.success('Membro adicionado à equipe.');
      }
      setEmail('');
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao convidar');
    } finally {
      setInviting(false);
    }
  };

  const changeRole = async (memberId: string, newRole: Role) => {
    const { error } = await supabase
      .from('store_members')
      .update({ role: newRole })
      .eq('id', memberId);
    if (error) return toast.error(error.message);
    toast.success('Papel atualizado');
    load();
  };

  const remove = async (m: Member) => {
    if (!confirm(`Remover ${m.email} da equipe?`)) return;
    const { error } = await supabase.from('store_members').delete().eq('id', m.id);
    if (error) return toast.error(error.message);
    toast.success('Membro removido');
    load();
  };

  const copy = (v: string) => {
    navigator.clipboard.writeText(v).then(() => toast.success('Copiado'));
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-display text-xl flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Convidar membro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={invite} className="grid gap-4 md:grid-cols-[1fr,180px,auto] items-end">
            <div className="space-y-2">
              <Label htmlFor="member-email">Email do membro</Label>
              <Input
                id="member-email"
                type="email"
                placeholder="membro@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Gerente</SelectItem>
                  <SelectItem value="attendant">Atendente</SelectItem>
                  <SelectItem value="kitchen">Cozinha</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={inviting}>
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Convidar'}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-3">{ROLE_HINT[role]}</p>

          {tempCred && (
            <div className="mt-4 p-4 rounded-lg border border-primary/40 bg-primary/5 space-y-2">
              <p className="text-sm font-medium">Senha temporária gerada — envie ao membro:</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-mono">Email:</span>
                <code className="bg-background px-2 py-1 rounded">{tempCred.email}</code>
                <Button size="sm" variant="ghost" onClick={() => copy(tempCred.email)}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-mono">Senha:</span>
                <code className="bg-background px-2 py-1 rounded">{tempCred.password}</code>
                <Button size="sm" variant="ghost" onClick={() => copy(tempCred.password)}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <Button size="sm" variant="outline" onClick={() => setTempCred(null)}>Fechar</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-display text-xl flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Equipe ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">
              Nenhum membro ainda. Convide alguém acima.
            </p>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border bg-background">
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-medium">{m.email || m.user_id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">
                      Desde {new Date(m.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Select value={m.role} onValueChange={(v) => changeRole(m.id, v as Role)}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">{ROLE_LABELS.manager}</SelectItem>
                      <SelectItem value="attendant">{ROLE_LABELS.attendant}</SelectItem>
                      <SelectItem value="kitchen">{ROLE_LABELS.kitchen}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => remove(m)} className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
