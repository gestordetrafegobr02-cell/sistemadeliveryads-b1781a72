import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { pdv, PdvSession, PdvSessionItem, PdvTable } from '@/lib/pdv';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, ArrowLeft, Send, Receipt, Users, Store as StoreIcon, X, Search } from 'lucide-react';
import { toast } from 'sonner';
import { printOrderReceipt } from '@/lib/printReceipt';
import { getErrorMessage } from '@/lib/errorMapper';

interface Product { id: string; name: string; price: number; is_available: boolean; category_id: string | null; }
interface Props { storeId: string; storeName: string; canManageTables: boolean; }

const money = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;

export function PdvTab({ storeId, storeName, canManageTables }: Props) {
  const [tables, setTables] = useState<PdvTable[]>([]);
  const [sessions, setSessions] = useState<PdvSession[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);
  const [showTablesManager, setShowTablesManager] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [t, s] = await Promise.all([pdv.listTables(storeId), pdv.listOpenSessions(storeId)]);
      setTables(t); setSessions(s);
    } catch (e) { console.error(e); }
  }, [storeId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data: prods } = await supabase
        .from('products').select('id,name,price,is_available,category_id')
        .eq('store_id', storeId).eq('is_available', true).order('name');
      if (!mounted) return;
      setProducts((prods ?? []) as Product[]);
      await reload();
      setLoading(false);
    })();
    const unsub = pdv.subscribe(storeId, () => { reload(); });
    return () => { mounted = false; unsub(); };
  }, [storeId, reload]);

  const sessionByTable = useMemo(() => {
    const m = new Map<string, PdvSession>();
    for (const s of sessions) if (s.table_id) m.set(s.table_id, s);
    return m;
  }, [sessions]);

  const balcaoSessions = useMemo(() => sessions.filter(s => !s.table_id), [sessions]);

  const openTable = async (t: PdvTable) => {
    try {
      const existing = sessionByTable.get(t.id);
      if (existing) { setActiveSessionId(existing.id); return; }
      const id = await pdv.openSession(storeId, t.id);
      setActiveSessionId(id);
    } catch (e) { toast.error(getErrorMessage(e)); }
  };

  const openBalcao = async () => {
    try {
      const id = await pdv.openSession(storeId, null);
      setActiveSessionId(id);
    } catch (e) { toast.error(getErrorMessage(e)); }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  if (checkoutSessionId) {
    return <CheckoutView
      sessionId={checkoutSessionId}
      storeId={storeId}
      storeName={storeName}
      onBack={() => setCheckoutSessionId(null)}
      onDone={() => { setCheckoutSessionId(null); setActiveSessionId(null); reload(); }}
    />;
  }

  if (activeSessionId) {
    return <SessionView
      sessionId={activeSessionId}
      products={products}
      storeName={storeName}
      onBack={() => setActiveSessionId(null)}
      onCheckout={() => setCheckoutSessionId(activeSessionId)}
    />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">PDV — Mesas & Balcão</h2>
          <p className="text-sm text-muted-foreground">Toque em uma mesa para abrir ou continuar a comanda.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openBalcao} className="gap-2">
            <StoreIcon className="w-4 h-4" /> Balcão / Viagem
          </Button>
          {canManageTables && (
            <Button variant="secondary" onClick={() => setShowTablesManager(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Mesas
            </Button>
          )}
        </div>
      </div>

      {balcaoSessions.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="text-sm font-semibold">Comandas balcão abertas</div>
            <div className="flex flex-wrap gap-2">
              {balcaoSessions.map(s => (
                <Button key={s.id} size="sm" variant="outline" onClick={() => setActiveSessionId(s.id)} className="gap-2">
                  <Receipt className="w-4 h-4" /> {s.customer_name || 'Balcão'} — {money(s.total || s.subtotal)}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {tables.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          Nenhuma mesa cadastrada. {canManageTables && 'Toque em “Mesas” para criar a primeira.'}
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {tables.map(t => {
            const s = sessionByTable.get(t.id);
            const occupied = !!s;
            return (
              <button
                key={t.id}
                onClick={() => openTable(t)}
                className={`rounded-2xl p-4 text-left transition-all border-2 min-h-[110px] flex flex-col justify-between ${
                  occupied
                    ? 'bg-orange-500/15 border-orange-500 text-orange-100'
                    : 'bg-emerald-500/10 border-emerald-500/60 text-emerald-100 hover:bg-emerald-500/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">#{t.number}</div>
                  <Users className="w-4 h-4 opacity-70" />
                </div>
                <div className="text-xs opacity-80">{t.label || `${t.seats} lugares`}</div>
                <div className="text-sm font-semibold">
                  {occupied ? money(s!.total || s!.subtotal) : 'Livre'}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {canManageTables && (
        <TablesManagerDialog
          open={showTablesManager}
          onOpenChange={setShowTablesManager}
          storeId={storeId}
          tables={tables}
          onChanged={reload}
        />
      )}
    </div>
  );
}

// ---------- Session Editor ----------
function SessionView({ sessionId, products, storeName, onBack, onCheckout }: {
  sessionId: string; products: Product[]; storeName: string; onBack: () => void; onCheckout: () => void;
}) {
  const [session, setSession] = useState<PdvSession | null>(null);
  const [items, setItems] = useState<PdvSessionItem[]>([]);
  const [search, setSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const load = useCallback(async () => {
    const [s, its] = await Promise.all([pdv.getSession(sessionId), pdv.listItems(sessionId)]);
    setSession(s); setItems(its);
    if (s) {
      setCustomerName(s.customer_name || '');
      setCustomerPhone(s.customer_phone || '');
    }
  }, [sessionId]);

  useEffect(() => {
    load();
    const unsub = pdv.subscribe(session?.store_id || '', load);
    return () => { unsub(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products.slice(0, 30);
    return products.filter(p => p.name.toLowerCase().includes(q)).slice(0, 30);
  }, [products, search]);

  const addProduct = async (p: Product) => {
    try {
      const existing = items.find(i => i.product_id === p.id);
      if (existing) await pdv.updateItemQty(existing.id, existing.quantity + 1);
      else await pdv.addItem(sessionId, p.id, p.name, p.price, 1);
      await load();
    } catch (e) { toast.error(getErrorMessage(e)); }
  };

  const changeQty = async (item: PdvSessionItem, delta: number) => {
    const q = item.quantity + delta;
    try {
      if (q <= 0) await pdv.removeItem(item.id);
      else await pdv.updateItemQty(item.id, q);
      await load();
    } catch (e) { toast.error(getErrorMessage(e)); }
  };

  const saveCustomer = async () => {
    try { await pdv.updateSession(sessionId, { customer_name: customerName || null, customer_phone: customerPhone || null }); toast.success('Cliente salvo'); }
    catch (e) { toast.error(getErrorMessage(e)); }
  };

  const sendKitchen = async () => {
    try {
      await pdv.markItemsSent(sessionId);
      printOrderReceipt({
        id: sessionId,
        customer_name: customerName || (session?.table_id ? `Mesa` : 'Balcão'),
        items: items.map(i => ({ name: i.name, quantity: i.quantity, price: i.unit_price })),
        total: items.reduce((a, i) => a + i.unit_price * i.quantity, 0),
        created_at: new Date().toISOString(),
        store_name: `${storeName} — COZINHA`,
      });
      toast.success('Enviado para cozinha');
      await load();
    } catch (e) { toast.error(getErrorMessage(e)); }
  };

  const cancel = async () => {
    if (!confirm('Cancelar comanda? Os itens serão descartados.')) return;
    try { await pdv.cancelSession(sessionId); toast.success('Comanda cancelada'); onBack(); }
    catch (e) { toast.error(getErrorMessage(e)); }
  };

  if (!session) return <div className="flex justify-center py-16"><Loader2 className="animate-spin w-6 h-6" /></div>;

  const subtotal = items.reduce((a, i) => a + i.unit_price * i.quantity, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2"><ArrowLeft className="w-4 h-4" /> Voltar</Button>
        <h2 className="text-lg font-semibold flex-1">
          {session.table_id ? 'Comanda de Mesa' : 'Comanda Balcão'}
        </h2>
        <Button variant="ghost" size="sm" onClick={cancel} className="gap-2 text-destructive"><X className="w-4 h-4" /> Cancelar</Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Left: product search */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="max-h-[420px] overflow-y-auto space-y-1">
              {filtered.map(p => (
                <button key={p.id} onClick={() => addProduct(p)}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-accent text-left">
                  <span className="text-sm">{p.name}</span>
                  <span className="text-sm font-semibold text-primary">{money(p.price)}</span>
                </button>
              ))}
              {filtered.length === 0 && <div className="text-center text-sm text-muted-foreground py-8">Nenhum produto</div>}
            </div>
          </CardContent>
        </Card>

        {/* Right: current items */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Cliente</Label>
                <Input value={customerName} onChange={e => setCustomerName(e.target.value)} onBlur={saveCustomer} placeholder="Nome" />
              </div>
              <div>
                <Label className="text-xs">WhatsApp (cashback)</Label>
                <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} onBlur={saveCustomer} placeholder="(11) 9..." />
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {items.length === 0 && <div className="text-center text-sm text-muted-foreground py-8">Adicione produtos ao lado</div>}
              {items.map(it => (
                <div key={it.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/40">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{it.name}</div>
                    <div className="text-xs text-muted-foreground">{money(it.unit_price)} × {it.quantity} = {money(it.unit_price * it.quantity)}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => changeQty(it, -1)}>-</Button>
                    <span className="w-6 text-center text-sm">{it.quantity}</span>
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => changeQty(it, +1)}>+</Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => changeQty(it, -it.quantity)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="text-xl font-bold">{money(subtotal)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={sendKitchen} disabled={items.length === 0} className="gap-2">
                <Send className="w-4 h-4" /> Cozinha
              </Button>
              <Button onClick={onCheckout} disabled={items.length === 0} className="gap-2">
                <Receipt className="w-4 h-4" /> Fechar conta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------- Checkout ----------
function CheckoutView({ sessionId, storeId, storeName, onBack, onDone }: {
  sessionId: string; storeId: string; storeName: string; onBack: () => void; onDone: () => void;
}) {
  const [session, setSession] = useState<PdvSession | null>(null);
  const [items, setItems] = useState<PdvSessionItem[]>([]);
  const [payment, setPayment] = useState('cash');
  const [redeem, setRedeem] = useState(0);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    (async () => {
      const [s, its] = await Promise.all([pdv.getSession(sessionId), pdv.listItems(sessionId)]);
      setSession(s); setItems(its);
      if (s?.customer_phone) {
        try { setBalance(await pdv.cashbackBalance(storeId, s.customer_phone)); } catch { /* noop */ }
      }
      setLoading(false);
    })();
  }, [sessionId, storeId]);

  if (loading || !session) return <div className="flex justify-center py-16"><Loader2 className="animate-spin w-6 h-6" /></div>;
  const subtotal = items.reduce((a, i) => a + i.unit_price * i.quantity, 0);
  const finalTotal = Math.max(subtotal - redeem, 0);

  const finalize = async () => {
    setProcessing(true);
    try {
      const res = await pdv.closeSession(sessionId, payment, redeem);
      printOrderReceipt({
        id: sessionId,
        customer_name: session.customer_name || 'Cliente',
        customer_phone: session.customer_phone,
        payment_method: payment,
        items: items.map(i => ({ name: i.name, quantity: i.quantity, price: i.unit_price })),
        total: res.total,
        created_at: new Date().toISOString(),
        store_name: storeName,
      });
      toast.success(`Fechado! Total ${money(res.total)}${res.cashback_awarded > 0 ? ` · Cashback +${money(res.cashback_awarded)}` : ''}`);
      onDone();
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setProcessing(false); }
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2"><ArrowLeft className="w-4 h-4" /> Voltar</Button>
        <h2 className="text-lg font-semibold">Fechar Conta</h2>
      </div>
      <Card><CardContent className="p-4 space-y-3">
        <div className="space-y-1 max-h-[220px] overflow-y-auto">
          {items.map(i => (
            <div key={i.id} className="flex justify-between text-sm">
              <span>{i.quantity}× {i.name}</span>
              <span>{money(i.unit_price * i.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between border-t pt-2 text-sm">
          <span>Subtotal</span><span>{money(subtotal)}</span>
        </div>

        {balance > 0 && (
          <div className="space-y-1 p-2 rounded-lg bg-primary/10">
            <Label className="text-xs">Cashback disponível: {money(balance)}</Label>
            <Input type="number" min={0} max={Math.min(balance, subtotal)} step="0.01"
              value={redeem} onChange={e => setRedeem(Math.min(Number(e.target.value) || 0, balance, subtotal))} />
          </div>
        )}

        <div>
          <Label className="text-xs">Forma de pagamento</Label>
          <Select value={payment} onValueChange={setPayment}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Dinheiro</SelectItem>
              <SelectItem value="card">Cartão</SelectItem>
              <SelectItem value="pix">PIX</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-between text-2xl font-bold border-t pt-2">
          <span>Total</span><span className="text-primary">{money(finalTotal)}</span>
        </div>

        <Button onClick={finalize} disabled={processing} className="w-full gap-2" size="lg">
          {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
          Finalizar & Imprimir
        </Button>
      </CardContent></Card>
    </div>
  );
}

// ---------- Tables manager ----------
function TablesManagerDialog({ open, onOpenChange, storeId, tables, onChanged }: {
  open: boolean; onOpenChange: (v: boolean) => void; storeId: string; tables: PdvTable[]; onChanged: () => void;
}) {
  const [number, setNumber] = useState('');
  const [seats, setSeats] = useState('4');
  const [label, setLabel] = useState('');

  const add = async () => {
    const n = parseInt(number, 10);
    if (!n) { toast.error('Informe o número da mesa'); return; }
    try {
      await pdv.createTable(storeId, n, parseInt(seats, 10) || 4, label);
      setNumber(''); setLabel(''); setSeats('4');
      onChanged();
      toast.success('Mesa criada');
    } catch (e) { toast.error(getErrorMessage(e)); }
  };
  const del = async (id: string) => {
    if (!confirm('Excluir esta mesa?')) return;
    try { await pdv.deleteTable(id); onChanged(); } catch (e) { toast.error(getErrorMessage(e)); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Gerenciar Mesas</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Número</Label>
              <Input type="number" value={number} onChange={e => setNumber(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Lugares</Label>
              <Input type="number" value={seats} onChange={e => setSeats(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Apelido</Label>
              <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Ex: Varanda" />
            </div>
          </div>
          <Button onClick={add} className="w-full gap-2"><Plus className="w-4 h-4" /> Adicionar</Button>

          <div className="max-h-[280px] overflow-y-auto space-y-1 pt-2 border-t">
            {tables.map(t => (
              <div key={t.id} className="flex items-center justify-between p-2 rounded bg-secondary/40">
                <span className="text-sm">#{t.number} · {t.label || `${t.seats} lugares`}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del(t.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            {tables.length === 0 && <div className="text-center text-sm text-muted-foreground py-4">Nenhuma mesa</div>}
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
