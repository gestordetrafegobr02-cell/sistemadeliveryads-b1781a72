import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Sparkles, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UsageLog {
  id: string;
  function_name: string;
  model: string | null;
  store_id: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

// Estimativa de custo (créditos Lovable) para gpt-5.5:
// ~$1.25 / 1M input tokens, ~$10 / 1M output tokens.
// 1 crédito Lovable ≈ $0.005 (aprox). Ajuste conforme seu plano.
const CREDIT_PER_1M_INPUT = 250; // ~$1.25
const CREDIT_PER_1M_OUTPUT = 2000; // ~$10
const FREE_MONTHLY_ALLOWANCE_CREDITS = 40; // allowance mensal grátis do AI Gateway

function estimateCredits(promptTokens: number, completionTokens: number) {
  return (
    (promptTokens / 1_000_000) * CREDIT_PER_1M_INPUT +
    (completionTokens / 1_000_000) * CREDIT_PER_1M_OUTPUT
  );
}

export function AIUsageTab() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('ai_usage_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    setLogs((data as UsageLog[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    const channel = supabase
      .channel('ai_usage_logs_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ai_usage_logs' },
        (payload) => {
          setLogs((prev) => [payload.new as UsageLog, ...prev].slice(0, 200));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const monthLogs = logs.filter((l) => l.created_at >= startOfMonth);
    const dayLogs = logs.filter((l) => l.created_at >= startOfDay);

    const monthTokens = monthLogs.reduce((s, l) => s + (l.total_tokens || 0), 0);
    const monthCreditsEst = monthLogs.reduce(
      (s, l) => s + estimateCredits(l.prompt_tokens || 0, l.completion_tokens || 0),
      0,
    );
    const dayCreditsEst = dayLogs.reduce(
      (s, l) => s + estimateCredits(l.prompt_tokens || 0, l.completion_tokens || 0),
      0,
    );

    const successCount = monthLogs.filter((l) => l.success).length;
    const errorCount = monthLogs.filter((l) => !l.success).length;

    const remaining = Math.max(0, FREE_MONTHLY_ALLOWANCE_CREDITS - monthCreditsEst);
    const pctUsed = Math.min(100, (monthCreditsEst / FREE_MONTHLY_ALLOWANCE_CREDITS) * 100);

    return {
      monthCalls: monthLogs.length,
      dayCalls: dayLogs.length,
      monthTokens,
      monthCreditsEst,
      dayCreditsEst,
      successCount,
      errorCount,
      remaining,
      pctUsed,
    };
  }, [logs]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Allowance grátis */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle className="font-display text-xl">Uso da IA — Mês atual</CardTitle>
          </div>
          <CardDescription>
            Estimativa de consumo do AI Gateway (créditos Lovable). Allowance grátis mensal: {FREE_MONTHLY_ALLOWANCE_CREDITS} créditos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {stats.monthCreditsEst.toFixed(3)} / {FREE_MONTHLY_ALLOWANCE_CREDITS} créditos
              </span>
              <span className="font-semibold">
                {stats.remaining.toFixed(3)} créditos restantes
              </span>
            </div>
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  stats.pctUsed > 90
                    ? 'bg-destructive'
                    : stats.pctUsed > 70
                    ? 'bg-yellow-500'
                    : 'bg-primary'
                }`}
                style={{ width: `${stats.pctUsed}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.pctUsed.toFixed(1)}% do allowance grátis mensal utilizado. Após esgotado, o consumo é debitado dos créditos pagos do workspace.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardDescription>Chamadas hoje</CardDescription>
            <CardTitle className="text-3xl font-display">{stats.dayCalls}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              ~{stats.dayCreditsEst.toFixed(3)} créditos
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardDescription>Chamadas no mês</CardDescription>
            <CardTitle className="text-3xl font-display">{stats.monthCalls}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {stats.monthTokens.toLocaleString('pt-BR')} tokens
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardDescription>Sucesso</CardDescription>
            <CardTitle className="text-3xl font-display text-green-600">
              {stats.successCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              este mês
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardDescription>Erros</CardDescription>
            <CardTitle className="text-3xl font-display text-destructive">
              {stats.errorCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              este mês
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent calls */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-display text-lg">Últimas 200 chamadas (tempo real)</CardTitle>
          <CardDescription>Atualiza automaticamente conforme a IA é usada nas lojas.</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma chamada de IA registrada ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">~Créditos</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const credits = estimateCredits(log.prompt_tokens, log.completion_tokens);
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(log.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{log.function_name}</TableCell>
                        <TableCell className="font-mono text-xs">{log.model ?? '—'}</TableCell>
                        <TableCell className="text-right text-xs">
                          {log.total_tokens.toLocaleString('pt-BR')}
                          <div className="text-muted-foreground">
                            {log.prompt_tokens}↑ {log.completion_tokens}↓
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          {credits.toFixed(4)}
                        </TableCell>
                        <TableCell>
                          {log.success ? (
                            <Badge variant="outline" className="text-green-600 border-green-600/40">
                              OK
                            </Badge>
                          ) : (
                            <Badge variant="destructive" title={log.error_message ?? ''}>
                              Erro
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
