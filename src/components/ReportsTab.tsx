import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, MapPin, Trophy, DollarSign, Calendar as CalendarIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfDay, endOfDay, subDays, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

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

type PresetKey = 'today' | '7d' | '30d' | 'month' | 'custom';

function computeRange(preset: PresetKey, custom?: DateRange): { from: Date; to: Date } {
  const now = new Date();
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case '7d':
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case '30d':
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case 'month':
      return { from: startOfMonth(now), to: endOfDay(now) };
    case 'custom':
      return {
        from: startOfDay(custom?.from ?? subDays(now, 6)),
        to: endOfDay(custom?.to ?? custom?.from ?? now),
      };
  }
}

export function ReportsTab({ storeId }: ReportsTabProps) {
  const [stats, setStats] = useState<StoreStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<PresetKey>('7d');
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  const range = useMemo(() => computeRange(preset, customRange), [preset, customRange]);

  useEffect(() => {
    let cancelled = false;
    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.rpc('get_store_stats', {
          p_store_id: storeId,
          p_start_date: range.from.toISOString(),
          p_end_date: range.to.toISOString(),
        });
        if (cancelled) return;
        if (error) throw error;
        setStats(data as unknown as StoreStats);
      } catch (err) {
        if (cancelled) return;
        console.error('Error fetching stats:', err);
        setError('Erro ao carregar estatísticas');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchStats();
    return () => { cancelled = true; };
  }, [storeId, range.from, range.to]);

  const chartData = (stats?.daily_revenue ?? []).map((d) => ({
    day: format(new Date(d.day), 'dd/MM', { locale: ptBR }),
    revenue: d.revenue,
    orders: d.order_count,
  }));

  const chartConfig = {
    revenue: { label: 'Faturamento', color: 'hsl(var(--primary))' },
  };

  const rangeLabel = `${format(range.from, "dd MMM", { locale: ptBR })} — ${format(range.to, "dd MMM yyyy", { locale: ptBR })}`;

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="w-4 h-4" />
            <span>Período:</span>
          </div>
          <Select value={preset} onValueChange={(v) => setPreset(v as PresetKey)}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {preset === 'custom' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('justify-start text-left font-normal w-full sm:w-auto', !customRange && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customRange?.from
                    ? customRange.to
                      ? `${format(customRange.from, 'dd/MM/yy')} - ${format(customRange.to, 'dd/MM/yy')}`
                      : format(customRange.from, 'dd/MM/yy')
                    : 'Escolher datas'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={customRange}
                  onSelect={setCustomRange}
                  numberOfMonths={2}
                  locale={ptBR}
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
          )}

          <div className="sm:ml-auto text-xs text-muted-foreground">{rangeLabel}</div>
        </CardContent>
      </Card>

      {loading ? (
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
      ) : error ? (
        <Card className="bg-card border-border">
          <CardContent className="p-6 text-center text-muted-foreground">{error}</CardContent>
        </Card>
      ) : !stats ? null : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <DollarSign className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Faturamento</p>
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
                    <p className="text-sm text-muted-foreground">Pedidos</p>
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
                📊 Faturamento por dia
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum dado disponível no período</p>
              ) : (
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `R$${v}`} />
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
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Top 5 Bairros
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.top_neighborhoods.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Nenhum dado disponível</p>
                ) : (
                  <div className="space-y-3">
                    {stats.top_neighborhoods.map((n, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-medium flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-medium text-foreground truncate max-w-[180px]">{n.neighborhood}</span>
                        </div>
                        <span className="text-muted-foreground text-sm">{n.order_count} pedidos</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-accent-foreground" />
                  Produtos Campeões
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.top_products.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Nenhum dado disponível</p>
                ) : (
                  <div className="space-y-3">
                    {stats.top_products.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-accent/20 text-accent-foreground text-sm font-medium flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-medium text-foreground truncate max-w-[180px]">{p.product_name}</span>
                        </div>
                        <span className="text-muted-foreground text-sm">{p.total_quantity} vendas</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
