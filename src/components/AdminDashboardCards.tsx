import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, ShoppingCart, Trophy, TrendingUp } from 'lucide-react';

interface Order {
  id: string;
  total: number;
  status: string | null;
  items: unknown;
  created_at: string;
}

interface AdminDashboardCardsProps {
  orders: Order[];
}

interface OrderItem {
  name: string;
  quantity: number;
}

export function AdminDashboardCards({ orders }: AdminDashboardCardsProps) {
  const todayStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOrders = orders.filter((o) => {
      const d = new Date(o.created_at);
      return d >= today && o.status !== 'cancelado' && o.status !== 'cancelled' && o.status !== 'canceled';
    });

    const revenue = todayOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const count = todayOrders.length;

    // Top 3 products
    const productMap = new Map<string, number>();
    todayOrders.forEach((o) => {
      if (Array.isArray(o.items)) {
        (o.items as OrderItem[]).forEach((item) => {
          const current = productMap.get(item.name) || 0;
          productMap.set(item.name, current + (item.quantity || 1));
        });
      }
    });

    const topProducts = Array.from(productMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return { revenue, count, topProducts };
  }, [orders]);

  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Faturamento Hoje</p>
                <p className="text-xl font-bold text-foreground">
                  R$ {todayStats.revenue.toFixed(2).replace('.', ',')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <ShoppingCart className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pedidos Hoje</p>
                <p className="text-xl font-bold text-foreground">{todayStats.count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {todayStats.topProducts.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Top Produtos Hoje</p>
            </div>
            <div className="space-y-2">
              {todayStats.topProducts.map(([name, qty], idx) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-foreground truncate max-w-[200px]">{name}</span>
                  </div>
                  <span className="text-muted-foreground">{qty}x</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
