import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageCircle, ShoppingCart, Clock, AlertTriangle } from 'lucide-react';
import { formatRecoveryMessage, createRecoveryWhatsAppUrl } from '@/lib/recoveryMessage';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AbandonedCart {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  created_at: string;
  recovered_at: string | null;
  converted_to_order_id: string | null;
}

interface AbandonedCartsTabProps {
  storeId: string;
  storeName: string;
  recoveryTemplate: string | null;
  recoveryDelayMinutes: number;
  onAbandonedCountChange?: (count: number) => void;
}

const DEFAULT_TEMPLATE = 'Olá {cliente}, notamos que você deixou um {pedido} no carrinho na {loja}. Quer finalizar seu pedido agora?';

export function AbandonedCartsTab({ 
  storeId, 
  storeName, 
  recoveryTemplate,
  recoveryDelayMinutes,
  onAbandonedCountChange 
}: AbandonedCartsTabProps) {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAbandonedCarts();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('abandoned-carts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'abandoned_carts',
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          fetchAbandonedCarts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, recoveryDelayMinutes]);

  async function fetchAbandonedCarts() {
    // Fetch abandoned carts that haven't been converted to orders
    const { data: cartsData, error } = await supabase
      .from('abandoned_carts')
      .select('*')
      .eq('store_id', storeId)
      .is('converted_to_order_id', null)
      .is('recovered_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching abandoned carts:', error);
      setLoading(false);
      return;
    }

    // Filter out carts where customer already placed an order (by phone)
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('customer_phone')
      .eq('store_id', storeId)
      .not('customer_phone', 'is', null);

    const orderedPhones = new Set(
      (recentOrders || []).map(o => o.customer_phone?.replace(/\D/g, ''))
    );

    // Type assertion for items
    const typedCarts = (cartsData || []).map(cart => ({
      ...cart,
      items: cart.items as AbandonedCart['items']
    }));

    const filteredCarts = typedCarts.filter(cart => {
      if (!cart.customer_phone) return true; // Keep carts without phone
      const cleanPhone = cart.customer_phone.replace(/\D/g, '');
      return !orderedPhones.has(cleanPhone);
    });

    // Filter carts based on recovery delay - only show carts older than the configured delay
    const delayThreshold = new Date(Date.now() - recoveryDelayMinutes * 60 * 1000);
    const filteredByDelay = filteredCarts.filter(
      cart => new Date(cart.created_at) < delayThreshold
    );

    setCarts(filteredByDelay);
    
    // Calculate carts from last 60 minutes for badge (those that recently crossed the threshold)
    const recentCount = filteredByDelay.length;
    
    onAbandonedCountChange?.(recentCount);
    setLoading(false);
  }

  function handleRecoverSale(cart: AbandonedCart) {
    if (!cart.customer_phone) {
      toast.error('Cliente sem telefone cadastrado');
      return;
    }

    const template = recoveryTemplate || DEFAULT_TEMPLATE;
    const message = formatRecoveryMessage(
      template,
      cart.customer_name,
      storeName,
      cart.items
    );
    
    const url = createRecoveryWhatsAppUrl(cart.customer_phone, message);
    window.open(url, '_blank');

    // Mark as recovered
    supabase
      .from('abandoned_carts')
      .update({ recovered_at: new Date().toISOString() })
      .eq('id', cart.id)
      .then(() => {
        toast.success('Mensagem de recuperação enviada!');
        fetchAbandonedCarts();
      });
  }

  function formatTimeAgo(dateString: string) {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: ptBR,
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="font-display text-xl flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          Carrinhos Abandonados
        </CardTitle>
      </CardHeader>
      <CardContent>
        {carts.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nenhum carrinho abandonado no momento
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Quando clientes abandonarem carrinhos, eles aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {carts.map((cart) => {
              const isRecent = new Date(cart.created_at) > new Date(Date.now() - 60 * 60 * 1000);
              
              return (
                <div 
                  key={cart.id} 
                  className={`p-4 glass-card rounded-lg space-y-3 ${isRecent ? 'ring-2 ring-orange-500/30' : ''}`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{cart.customer_name}</p>
                        {isRecent && (
                          <Badge variant="destructive" className="text-xs gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Urgente
                          </Badge>
                        )}
                      </div>
                      {cart.customer_phone && (
                        <p className="text-sm text-muted-foreground">{cart.customer_phone}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{formatTimeAgo(cart.created_at)}</span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="text-sm text-muted-foreground">
                    {cart.items.map((item, i, arr) => (
                      <span key={i}>
                        {item.quantity}x {item.name}
                        {i < arr.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-lg font-semibold text-primary">
                      R$ {Number(cart.total).toFixed(2).replace('.', ',')}
                    </span>
                    
                    <Button
                      onClick={() => handleRecoverSale(cart)}
                      disabled={!cart.customer_phone}
                      className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Recuperar Venda
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
