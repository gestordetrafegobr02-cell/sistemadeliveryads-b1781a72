import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingUp, MapPin, Trophy, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface StoreStats {
  daily_revenue: Array<{ day: string; revenue: number; order_count: number }>;
  top_neighborhoods: Array<{ neighborhood: string; order_count: number }>;
  top_products: Array<{ product_name: string; total_quantity: number }>;
  total_revenue: number;
  total_orders: number;
  avg_ticket: number;
}

interface ReportsTabProps {
  storeId: string;
}

export function ReportsTab({ storeId }: ReportsTabProps) {
  const [stats, setStats] = useState<StoreStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, [storeId]);

  async function fetchStats() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc('get_store_stats', { p_store_id: storeId });

      if (error) throw error;
      setStats(data as unknown as StoreStats);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 text-center text-muted-foreground">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  // Format chart data for last 7 days
  const chartData = stats.daily_revenue.map((d) => ({
    day: new Date(d.day).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }),
    revenue: d.revenue,
    orders: d.order_count,
  }));

  // Chart config
  const chartConfig = {
    revenue: {
      label: 'Faturamento',
      color: 'hsl(var(--primary))',
    },
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Faturamento Total</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {stats.total_revenue.toFixed(2).replace('.', ',')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/20">
                <TrendingUp className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {stats.avg_ticket.toFixed(2).replace('.', ',')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary">
                <Trophy className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Pedidos</p>
                <p className="text-2xl font-bold text-foreground">{stats.total_orders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-display flex items-center gap-2">
            📊 Faturamento - Últimos 7 Dias
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum dado disponível no período
            </p>
          ) : (
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  fontSize={12}
                  tickFormatter={(value) => `R$${value}`}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value) => [`R$ ${Number(value).toFixed(2).replace('.', ',')}`, 'Faturamento']}
                />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Neighborhoods */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Top 5 Bairros
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.top_neighborhoods.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nenhum dado disponível
              </p>
            ) : (
              <div className="space-y-3">
                {stats.top_neighborhoods.map((n, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-medium flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-foreground truncate max-w-[180px]">
                        {n.neighborhood}
                      </span>
                    </div>
                    <span className="text-muted-foreground text-sm">
                      {n.order_count} pedidos
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Trophy className="w-5 h-5 text-accent-foreground" />
              Produtos Campeões
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.top_products.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nenhum dado disponível
              </p>
            ) : (
              <div className="space-y-3">
                {stats.top_products.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-accent/20 text-accent-foreground text-sm font-medium flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-foreground truncate max-w-[180px]">
                        {p.product_name}
                      </span>
                    </div>
                    <span className="text-muted-foreground text-sm">
                      {p.total_quantity} vendas
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
