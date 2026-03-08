import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DollarSign, ShoppingCart, Trophy, TrendingUp, TrendingDown, CalendarIcon } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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

type PresetKey = 'today' | 'yesterday' | 'last7' | 'custom';

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: 'yesterday', label: 'Ontem' },
  { key: 'last7', label: '7 dias' },
  { key: 'custom', label: 'Personalizado' },
];

function getDateRange(preset: PresetKey, customFrom?: Date, customTo?: Date): { from: Date; to: Date } {
  const now = new Date();
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday': {
      const y = subDays(now, 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case 'last7':
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case 'custom':
      return {
        from: startOfDay(customFrom || subDays(now, 6)),
        to: endOfDay(customTo || now),
      };
  }
}

function getPreviousRange(from: Date, to: Date): { from: Date; to: Date } {
  const days = differenceInDays(to, from) + 1;
  return {
    from: startOfDay(subDays(from, days)),
    to: endOfDay(subDays(from, 1)),
  };
}

function filterOrders(orders: Order[], from: Date, to: Date) {
  return orders.filter((o) => {
    const d = new Date(o.created_at);
    return d >= from && d <= to && o.status !== 'cancelado' && o.status !== 'cancelled' && o.status !== 'canceled';
  });
}

function ComparisonBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-500">
        <TrendingUp className="w-3 h-3" /> Novo
      </span>
    );
  }
  const pct = ((current - previous) / previous) * 100;
  const isUp = pct >= 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', isUp ? 'text-green-500' : 'text-red-500')}>
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isUp ? '+' : ''}{pct.toFixed(0)}%
    </span>
  );
}

export function AdminDashboardCards({ orders }: AdminDashboardCardsProps) {
  const [preset, setPreset] = useState<PresetKey>('today');
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectingField, setSelectingField] = useState<'from' | 'to'>('from');

  const stats = useMemo(() => {
    const { from, to } = getDateRange(preset, customFrom, customTo);
    const prev = getPreviousRange(from, to);

    const currentOrders = filterOrders(orders, from, to);
    const prevOrders = filterOrders(orders, prev.from, prev.to);

    const revenue = currentOrders.reduce((s, o) => s + Number(o.total), 0);
    const prevRevenue = prevOrders.reduce((s, o) => s + Number(o.total), 0);
    const count = currentOrders.length;
    const prevCount = prevOrders.length;

    // Top 3 products
    const productMap = new Map<string, number>();
    currentOrders.forEach((o) => {
      if (Array.isArray(o.items)) {
        (o.items as OrderItem[]).forEach((item) => {
          const cur = productMap.get(item.name) || 0;
          productMap.set(item.name, cur + (item.quantity || 1));
        });
      }
    });

    const topProducts = Array.from(productMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return { revenue, prevRevenue, count, prevCount, topProducts, from, to };
  }, [orders, preset, customFrom, customTo]);

  const periodLabel = useMemo(() => {
    if (preset === 'today') return 'Hoje';
    if (preset === 'yesterday') return 'Ontem';
    if (preset === 'last7') return 'Últimos 7 dias';
    if (customFrom && customTo) {
      return `${format(customFrom, 'dd/MM', { locale: ptBR })} - ${format(customTo, 'dd/MM', { locale: ptBR })}`;
    }
    return 'Personalizado';
  }, [preset, customFrom, customTo]);

  return (
    <div className="space-y-4 mb-6">
      {/* Period Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {PRESETS.filter((p) => p.key !== 'custom').map((p) => (
          <Button
            key={p.key}
            size="sm"
            variant={preset === p.key ? 'default' : 'outline'}
            className={cn(preset === p.key && 'bg-primary text-primary-foreground')}
            onClick={() => setPreset(p.key)}
          >
            {p.label}
          </Button>
        ))}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant={preset === 'custom' ? 'default' : 'outline'}
              className={cn('gap-1.5', preset === 'custom' && 'bg-primary text-primary-foreground')}
              onClick={() => {
                setPreset('custom');
                setCalendarOpen(true);
              }}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              {preset === 'custom' && customFrom && customTo
                ? `${format(customFrom, 'dd/MM')} - ${format(customTo, 'dd/MM')}`
                : 'Personalizado'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3 space-y-3" align="start">
            <div className="flex gap-2">
              <Button size="sm" variant={selectingField === 'from' ? 'default' : 'outline'} onClick={() => setSelectingField('from')}>
                De: {customFrom ? format(customFrom, 'dd/MM/yy') : '—'}
              </Button>
              <Button size="sm" variant={selectingField === 'to' ? 'default' : 'outline'} onClick={() => setSelectingField('to')}>
                Até: {customTo ? format(customTo, 'dd/MM/yy') : '—'}
              </Button>
            </div>
            <Calendar
              mode="single"
              selected={selectingField === 'from' ? customFrom : customTo}
              onSelect={(date) => {
                if (selectingField === 'from') {
                  setCustomFrom(date ?? undefined);
                  setSelectingField('to');
                } else {
                  setCustomTo(date ?? undefined);
                  setCalendarOpen(false);
                }
              }}
              disabled={(date) => date > new Date()}
              className={cn('p-3 pointer-events-auto')}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Faturamento {periodLabel}</p>
                <p className="text-xl font-bold text-foreground">
                  R$ {stats.revenue.toFixed(2).replace('.', ',')}
                </p>
                <ComparisonBadge current={stats.revenue} previous={stats.prevRevenue} />
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
                <p className="text-xs text-muted-foreground">Pedidos {periodLabel}</p>
                <p className="text-xl font-bold text-foreground">{stats.count}</p>
                <ComparisonBadge current={stats.count} previous={stats.prevCount} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {stats.topProducts.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Top Produtos ({periodLabel})</p>
            </div>
            <div className="space-y-2">
              {stats.topProducts.map(([name, qty], idx) => (
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
