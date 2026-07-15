import { supabase } from '@/integrations/supabase/client';

// Supabase generated types don't include the new PDV tables/RPCs yet.
// We cast the client to `any` for these calls until types regenerate.
const db = supabase as unknown as {
  from: (t: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => any;
  channel: (name: string) => any;
  removeChannel: (ch: unknown) => void;
};

export type TableStatus = 'free' | 'occupied' | 'reserved';

export interface PdvTable {
  id: string;
  store_id: string;
  number: number;
  label: string | null;
  seats: number;
  status: TableStatus;
  sort_order: number;
}

export interface PdvSession {
  id: string;
  store_id: string;
  table_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  status: 'open' | 'closed' | 'canceled';
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string | null;
  opened_at: string;
  closed_at: string | null;
}

export interface PdvSessionItem {
  id: string;
  session_id: string;
  product_id: string | null;
  name: string;
  unit_price: number;
  quantity: number;
  note: string | null;
  sent_to_kitchen_at: string | null;
}

export const pdv = {
  async listTables(storeId: string): Promise<PdvTable[]> {
    const { data, error } = await db.from('tables').select('*').eq('store_id', storeId).order('sort_order').order('number');
    if (error) throw error;
    return (data ?? []) as PdvTable[];
  },
  async createTable(storeId: string, number: number, seats: number, label?: string) {
    const { error } = await db.from('tables').insert({ store_id: storeId, number, seats, label: label || null });
    if (error) throw error;
  },
  async deleteTable(id: string) {
    const { error } = await db.from('tables').delete().eq('id', id);
    if (error) throw error;
  },
  async listOpenSessions(storeId: string): Promise<PdvSession[]> {
    const { data, error } = await db.from('pdv_sessions').select('*').eq('store_id', storeId).eq('status', 'open').order('opened_at');
    if (error) throw error;
    return (data ?? []) as PdvSession[];
  },
  async openSession(storeId: string, tableId: string | null, customerName?: string, customerPhone?: string): Promise<string> {
    const { data, error } = await db.rpc('open_pdv_session', {
      p_store_id: storeId,
      p_table_id: tableId,
      p_customer_name: customerName ?? null,
      p_customer_phone: customerPhone ?? null,
    });
    if (error) throw error;
    return data as string;
  },
  async getSession(id: string): Promise<PdvSession | null> {
    const { data, error } = await db.from('pdv_sessions').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data ?? null) as PdvSession | null;
  },
  async updateSession(id: string, patch: Partial<Pick<PdvSession, 'customer_name' | 'customer_phone'>>) {
    const { error } = await db.from('pdv_sessions').update(patch).eq('id', id);
    if (error) throw error;
  },
  async listItems(sessionId: string): Promise<PdvSessionItem[]> {
    const { data, error } = await db.from('pdv_session_items').select('*').eq('session_id', sessionId).order('created_at');
    if (error) throw error;
    return (data ?? []) as PdvSessionItem[];
  },
  async addItem(sessionId: string, productId: string, name: string, price: number, quantity: number, note?: string) {
    const { error } = await db.from('pdv_session_items').insert({
      session_id: sessionId, product_id: productId, name, unit_price: price, quantity, note: note || null,
    });
    if (error) throw error;
  },
  async updateItemQty(id: string, quantity: number) {
    const { error } = await db.from('pdv_session_items').update({ quantity }).eq('id', id);
    if (error) throw error;
  },
  async removeItem(id: string) {
    const { error } = await db.from('pdv_session_items').delete().eq('id', id);
    if (error) throw error;
  },
  async markItemsSent(sessionId: string) {
    const { error } = await db.from('pdv_session_items').update({ sent_to_kitchen_at: new Date().toISOString() }).eq('session_id', sessionId).is('sent_to_kitchen_at', null);
    if (error) throw error;
  },
  async closeSession(sessionId: string, paymentMethod: string, redeemCashback = 0) {
    const { data, error } = await db.rpc('close_pdv_session', {
      p_session_id: sessionId, p_payment_method: paymentMethod, p_redeem_cashback: redeemCashback,
    });
    if (error) throw error;
    return data as { session_id: string; total: number; redeemed: number; cashback_awarded: number };
  },
  async cancelSession(sessionId: string) {
    const { error } = await db.rpc('cancel_pdv_session', { p_session_id: sessionId });
    if (error) throw error;
  },
  async cashbackBalance(storeId: string, phone: string): Promise<number> {
    const { data, error } = await db.rpc('get_cashback_balance', { p_store_id: storeId, p_customer_phone: phone });
    if (error) throw error;
    return Number(data ?? 0);
  },
  subscribe(storeId: string, cb: () => void) {
    const ch = db.channel(`pdv:${storeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables', filter: `store_id=eq.${storeId}` }, cb)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pdv_sessions', filter: `store_id=eq.${storeId}` }, cb)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pdv_session_items' }, cb)
      .subscribe();
    return () => db.removeChannel(ch);
  },
};
