import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  LogOut,
  Store,
  Users,
  ClipboardList,
  ExternalLink,
  Shield,
  Power,
  Trash2,
  Eye,
  Plus,
  Utensils,
  Leaf,
  Building2,
  ShoppingBasket,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import PlatformMetricsCard from '@/components/PlatformMetricsCard';
import TrialEditor from '@/components/TrialEditor';

const MASTER_EMAIL = 'igormoises.ads@gmail.com';

interface AdminStore {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  owner_email: string | null;
  whatsapp: string | null;
  pix_key: string | null;
  delivery_fee: number | null;
  is_open_manual: boolean;
  is_active?: boolean;
  trial_expires_at: string | null;
  created_at: string;
}

interface AdminOrder {
  id: string;
  store_id: string;
  store_name: string | null;
  customer_name: string;
  customer_phone: string | null;
  items: unknown;
  total: number;
  status: string | null;
  address: string | null;
  payment_method: string | null;
  created_at: string;
}

interface AdminUser {
  id: string;
  email: string | null;
  has_store: boolean;
  store_name: string | null;
  created_at: string;
}

interface StoreTemplate {
  id: string;
  name: string;
  slug: string;
  description: string | null;
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

export default function SuperAdmin() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();

  const [stores, setStores] = useState<AdminStore[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [templates, setTemplates] = useState<StoreTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stores');
  
  // Modal states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<AdminStore | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreSlug, setNewStoreSlug] = useState('');
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [creatingStore, setCreatingStore] = useState(false);
  const [togglingStore, setTogglingStore] = useState<string | null>(null);
  const [deletingStore, setDeletingStore] = useState(false);

  // Check if current user is master admin
  const isMasterAdmin = user?.email === MASTER_EMAIL;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!adminLoading && !isAdmin && user) {
      navigate('/admin');
    }
  }, [isAdmin, adminLoading, user, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, activeTab]);

  useEffect(() => {
    if (isAdmin && isMasterAdmin) {
      fetchTemplates();
    }
  }, [isAdmin, isMasterAdmin]);

  async function fetchData() {
    setLoading(true);
    try {
      if (activeTab === 'stores') {
        const { data } = await supabase.rpc('get_all_stores_admin');
        
        // Data now includes is_active and trial_expires_at from RPC
        if (data) {
          setStores(data as AdminStore[]);
        } else {
          setStores([]);
        }
      } else if (activeTab === 'orders') {
        const { data } = await supabase.rpc('get_all_orders_admin');
        setOrders((data as AdminOrder[]) ?? []);
      } else if (activeTab === 'users') {
        const { data } = await supabase.rpc('get_all_users_admin');
        setUsers((data as AdminUser[]) ?? []);
      }
    } catch {
      // Silent fail - admin functions may throw if not authorized
    } finally {
      setLoading(false);
    }
  }

  async function fetchTemplates() {
    const { data } = await supabase
      .from('store_templates')
      .select('id, name, slug, description');
    setTemplates((data as StoreTemplate[]) ?? []);
  }

  async function handleToggleActive(store: AdminStore) {
    if (!isMasterAdmin) return;
    
    setTogglingStore(store.id);
    try {
      const { data, error } = await supabase.rpc('toggle_store_active', {
        p_store_id: store.id,
      });

      if (error) throw error;

      setStores(prev =>
        prev.map(s =>
          s.id === store.id ? { ...s, is_active: data } : s
        )
      );

      toast.success(data ? 'Loja ativada!' : 'Loja bloqueada!');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao alterar status';
      toast.error(errorMessage);
    } finally {
      setTogglingStore(null);
    }
  }

  async function handleDeleteStore() {
    if (!storeToDelete || !isMasterAdmin) return;

    setDeletingStore(true);
    try {
      const { error } = await supabase.rpc('delete_store_master', {
        p_store_id: storeToDelete.id,
      });

      if (error) throw error;

      setStores(prev => prev.filter(s => s.id !== storeToDelete.id));
      toast.success('Loja excluída com sucesso!');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir loja';
      toast.error(errorMessage);
    } finally {
      setDeletingStore(false);
      setDeleteDialogOpen(false);
      setStoreToDelete(null);
    }
  }

  async function handleCreateStore() {
    if (!selectedTemplate || !newStoreName.trim() || !newStoreSlug.trim() || !selectedOwnerId) {
      toast.error('Preencha todos os campos');
      return;
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(newStoreSlug)) {
      toast.error('Slug deve conter apenas letras minúsculas, números e hífens');
      return;
    }

    setCreatingStore(true);
    try {
      const { data, error } = await supabase.rpc('create_store_from_template', {
        p_template_slug: selectedTemplate,
        p_store_name: newStoreName.trim(),
        p_store_slug: newStoreSlug.trim().toLowerCase(),
        p_owner_id: selectedOwnerId,
      });

      if (error) throw error;

      toast.success('Loja criada com sucesso!');
      setCreateDialogOpen(false);
      setSelectedTemplate('');
      setNewStoreName('');
      setNewStoreSlug('');
      setSelectedOwnerId('');
      
      // Refresh stores list
      fetchData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar loja';
      toast.error(errorMessage);
    } finally {
      setCreatingStore(false);
    }
  }

  function handleImpersonate(store: AdminStore) {
    // Open store admin in new tab with store context
    window.open(`/shop/${store.slug}`, '_blank');
  }

  // Generate slug from store name
  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-card border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="font-display text-2xl text-gradient">
              {isMasterAdmin ? 'Master Admin' : 'Super Admin'}
            </h1>
            {isMasterAdmin && (
              <Badge variant="default" className="bg-gradient-to-r from-primary to-orange-500">
                Master
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isMasterAdmin && (
              <Button
                onClick={() => {
                  // Fetch users if not loaded
                  if (users.length === 0) {
                    supabase.rpc('get_all_users_admin').then(({ data }) => {
                      setUsers((data as AdminUser[]) ?? []);
                    });
                  }
                  setCreateDialogOpen(true);
                }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Nova Loja
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin')}
              className="gap-2"
            >
              Minha Loja
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Platform Metrics - Only for Master Admin */}
        {isMasterAdmin && <PlatformMetricsCard />}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="bg-secondary">
              <TabsTrigger value="stores" className="gap-2">
                <Store className="w-4 h-4" />
                Lojas ({stores.length})
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-2">
                <ClipboardList className="w-4 h-4" />
                Pedidos
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <Users className="w-4 h-4" />
                Usuários
              </TabsTrigger>
            </TabsList>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchData}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>
          </div>

          {/* Stores Tab */}
          <TabsContent value="stores">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-display text-xl">Gerenciamento de Lojas</CardTitle>
                <CardDescription>
                  {isMasterAdmin
                    ? 'Controle total: bloquear, excluir ou visualizar qualquer loja.'
                    : 'Visualize todas as lojas cadastradas na plataforma.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : stores.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhuma loja cadastrada</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Loja</TableHead>
                          <TableHead>Dono</TableHead>
                          <TableHead>WhatsApp</TableHead>
                          <TableHead>Status</TableHead>
                          {isMasterAdmin && <TableHead>Trial</TableHead>}
                          <TableHead>Criada em</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stores.map((store) => (
                          <TableRow key={store.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{store.name}</p>
                                <p className="text-xs text-muted-foreground">/{store.slug}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {store.owner_email || 'N/A'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {store.whatsapp || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge variant={store.is_open_manual ? 'default' : 'secondary'}>
                                  {store.is_open_manual ? 'Aberta' : 'Fechada'}
                                </Badge>
                                {isMasterAdmin && (
                                  <Badge
                                    variant={store.is_active !== false ? 'outline' : 'destructive'}
                                    className="text-xs"
                                  >
                                    {store.is_active !== false ? 'Ativa' : 'Bloqueada'}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            {isMasterAdmin && (
                              <TableCell>
                                <TrialEditor
                                  storeId={store.id}
                                  currentTrialDate={store.trial_expires_at}
                                  onUpdate={(newDate) => {
                                    setStores(prev =>
                                      prev.map(s =>
                                        s.id === store.id
                                          ? { ...s, trial_expires_at: newDate }
                                          : s
                                      )
                                    );
                                  }}
                                />
                              </TableCell>
                            )}
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(store.created_at).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleImpersonate(store)}
                                  title="Visualizar Loja"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {isMasterAdmin && (
                                  <>
                                    <Button
                                      variant={store.is_active !== false ? 'outline' : 'default'}
                                      size="icon"
                                      onClick={() => handleToggleActive(store)}
                                      disabled={togglingStore === store.id}
                                      title={store.is_active !== false ? 'Bloquear Loja' : 'Desbloquear Loja'}
                                    >
                                      {togglingStore === store.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Power className="w-4 h-4" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="icon"
                                      onClick={() => {
                                        setStoreToDelete(store);
                                        setDeleteDialogOpen(true);
                                      }}
                                      title="Excluir Loja"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => window.open(`/shop/${store.slug}`, '_blank')}
                                  title="Abrir Cardápio"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-display text-xl">Todos os Pedidos</CardTitle>
                <CardDescription>Histórico de pedidos de todas as lojas.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : orders.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum pedido encontrado</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Loja</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{order.customer_name}</p>
                                <p className="text-xs text-muted-foreground">{order.customer_phone || 'N/A'}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {order.store_name || 'N/A'}
                            </TableCell>
                            <TableCell className="font-bold text-primary">
                              R$ {Number(order.total).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={order.status === 'pending' ? 'secondary' : 'default'}>
                                {order.status || 'pending'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(order.created_at).toLocaleString('pt-BR')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-display text-xl">Todos os Usuários</CardTitle>
                <CardDescription>Usuários registrados na plataforma.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : users.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum usuário encontrado</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Loja</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Cadastro</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">{u.email || 'N/A'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {u.has_store ? u.store_name : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={u.has_store ? 'default' : 'secondary'}>
                                {u.has_store ? 'Lojista' : 'Usuário'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(u.created_at).toLocaleDateString('pt-BR')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Loja Permanentemente</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir a loja <strong>{storeToDelete?.name}</strong>.
              Esta ação é irreversível e irá remover todos os produtos, categorias e pedidos
              associados a esta loja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingStore}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStore}
              disabled={deletingStore}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingStore ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir Definitivamente'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Store from Template Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Criar Nova Loja</DialogTitle>
            <DialogDescription>
              Selecione um template e configure os dados da nova loja.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Template Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Escolha o Template</Label>
              <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="storeName">Nome da Loja</Label>
                <Input
                  id="storeName"
                  placeholder="Ex: Burger House"
                  value={newStoreName}
                  onChange={(e) => {
                    setNewStoreName(e.target.value);
                    setNewStoreSlug(generateSlug(e.target.value));
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="storeSlug">Slug (URL)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">/shop/</span>
                  <Input
                    id="storeSlug"
                    placeholder="burger-house"
                    value={newStoreSlug}
                    onChange={(e) => setNewStoreSlug(e.target.value.toLowerCase())}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Apenas letras minúsculas, números e hífens.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Proprietário da Loja</Label>
                <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o proprietário..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.email || 'Sem email'} {u.has_store && '(já tem loja)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateStore}
              disabled={creatingStore || !selectedTemplate || !newStoreName || !selectedOwnerId}
            >
              {creatingStore ? (
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
    </div>
  );
}
