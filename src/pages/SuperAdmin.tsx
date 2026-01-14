import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, LogOut, Store, Users, ClipboardList, ExternalLink, Shield } from 'lucide-react';

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

export default function SuperAdmin() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stores');

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

  async function fetchData() {
    setLoading(true);
    try {
      if (activeTab === 'stores') {
        const { data } = await supabase.rpc('get_all_stores_admin');
        setStores((data as AdminStore[]) ?? []);
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
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="font-display text-2xl text-gradient">Super Admin</h1>
          </div>
          <div className="flex items-center gap-3">
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

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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

          {/* Stores Tab */}
          <TabsContent value="stores">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-display text-xl">Todas as Lojas</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : stores.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhuma loja cadastrada</p>
                ) : (
                  <div className="space-y-4">
                    {stores.map((store) => (
                      <div
                        key={store.id}
                        className="p-4 glass-card rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{store.name}</h3>
                            <Badge variant={store.is_open_manual ? 'default' : 'secondary'}>
                              {store.is_open_manual ? 'Aberta' : 'Fechada'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Dono: {store.owner_email || 'N/A'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            WhatsApp: {store.whatsapp || 'N/A'} | PIX: {store.pix_key ? '✓' : 'N/A'}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/shop/${store.slug}`, '_blank')}
                          className="gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Ver
                        </Button>
                      </div>
                    ))}
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
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : orders.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum pedido encontrado</p>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order.id} className="p-4 glass-card rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h3 className="font-medium">{order.customer_name}</h3>
                            <p className="text-sm text-muted-foreground">
                              Loja: {order.store_name || 'N/A'}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={order.status === 'pending' ? 'secondary' : 'default'}>
                              {order.status || 'pending'}
                            </Badge>
                            <p className="text-sm font-bold text-primary mt-1">
                              R$ {Number(order.total).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    ))}
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
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : users.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum usuário encontrado</p>
                ) : (
                  <div className="space-y-4">
                    {users.map((u) => (
                      <div key={u.id} className="p-4 glass-card rounded-lg flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{u.email || 'N/A'}</h3>
                          <p className="text-sm text-muted-foreground">
                            {u.has_store ? `Loja: ${u.store_name}` : 'Sem loja'}
                          </p>
                        </div>
                        <Badge variant={u.has_store ? 'default' : 'secondary'}>
                          {u.has_store ? 'Lojista' : 'Usuário'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
