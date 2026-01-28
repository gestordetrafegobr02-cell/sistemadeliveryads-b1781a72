import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, Store, Users, ShoppingCart, AlertTriangle, CheckCircle } from 'lucide-react';

interface PlatformStats {
  total_revenue: number;
  total_orders: number;
  total_stores: number;
  active_stores: number;
  stores_on_trial: number;
  expired_trials: number;
  total_users: number;
}

export default function PlatformMetricsCard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);
    try {
      // Using type assertion since types may not be updated yet
      const { data, error } = await supabase.rpc('get_platform_stats' as never);
      if (error) throw error;
      setStats(data as unknown as PlatformStats);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card className="col-span-full">
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const metrics = [
    {
      label: 'Faturamento Total',
      value: `R$ ${stats.total_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Total de Pedidos',
      value: stats.total_orders.toLocaleString('pt-BR'),
      icon: ShoppingCart,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Lojas Cadastradas',
      value: stats.total_stores,
      icon: Store,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Lojas Ativas',
      value: stats.active_stores,
      icon: CheckCircle,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Em Período de Teste',
      value: stats.stores_on_trial,
      icon: AlertTriangle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'Trials Expirados',
      value: stats.expired_trials,
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      label: 'Total de Usuários',
      value: stats.total_users,
      icon: Users,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
      {metrics.map((metric) => (
        <Card key={metric.label} className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className={`w-10 h-10 rounded-lg ${metric.bgColor} flex items-center justify-center mb-2`}>
              <metric.icon className={`w-5 h-5 ${metric.color}`} />
            </div>
            <CardTitle className="text-2xl font-bold">{metric.value}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">{metric.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
