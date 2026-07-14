// Thermal-printer friendly receipt (80mm) rendered via browser print dialog.

export interface PrintOrderItem {
  name: string;
  quantity: number;
  price: number;
  modifiers?: { name: string; price: number }[];
  observation?: string | null;
}

export interface PrintOrderData {
  id: string;
  customer_name: string;
  customer_phone?: string | null;
  address?: string | null;
  payment_method?: string | null;
  items: PrintOrderItem[];
  total: number;
  created_at: string;
  store_name: string;
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const money = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;

function payLabel(m?: string | null): string {
  if (!m) return '-';
  const s = m.replace(/^whatsapp_/, '');
  const map: Record<string, string> = { pix: 'PIX', cash: 'Dinheiro', card: 'Cartão na entrega' };
  return map[s] || s;
}

export function buildReceiptHtml(order: PrintOrderData): string {
  const shortId = order.id.slice(0, 8).toUpperCase();
  const when = new Date(order.created_at).toLocaleString('pt-BR');

  const itemsHtml = (order.items || [])
    .map((it) => {
      const line = `${it.quantity}x ${esc(it.name)}`;
      const price = money((Number(it.price) || 0) * (it.quantity || 1));
      const mods = (it.modifiers || [])
        .map((m) => `<div class="mod">+ ${esc(m.name)} (${money(m.price)})</div>`)
        .join('');
      const obs = it.observation ? `<div class="obs">Obs: ${esc(it.observation)}</div>` : '';
      return `<div class="row"><span>${line}</span><span>${price}</span></div>${mods}${obs}`;
    })
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Pedido ${shortId}</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; width: 72mm; }
  h1 { font-size: 15px; text-align: center; margin: 0 0 4px; }
  .center { text-align: center; }
  .muted { color: #333; font-size: 11px; }
  .divider { border-top: 1px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; gap: 6px; align-items: flex-start; margin: 2px 0; }
  .row span:first-child { flex: 1; word-break: break-word; }
  .mod { padding-left: 10px; font-size: 11px; }
  .obs { padding-left: 10px; font-style: italic; font-size: 11px; }
  .total { font-size: 15px; font-weight: bold; }
  .foot { text-align: center; margin-top: 8px; font-size: 11px; }
</style></head><body>
  <h1>${esc(order.store_name)}</h1>
  <div class="center muted">Pedido #${shortId}</div>
  <div class="center muted">${esc(when)}</div>
  <div class="divider"></div>
  <div><strong>Cliente:</strong> ${esc(order.customer_name)}</div>
  ${order.customer_phone ? `<div><strong>Tel:</strong> ${esc(order.customer_phone)}</div>` : ''}
  ${order.address ? `<div><strong>Endereço:</strong> ${esc(order.address)}</div>` : '<div><strong>Retirada no local</strong></div>'}
  <div class="divider"></div>
  ${itemsHtml}
  <div class="divider"></div>
  <div class="row total"><span>TOTAL</span><span>${money(order.total)}</span></div>
  <div class="muted">Pagamento: ${esc(payLabel(order.payment_method))}</div>
  <div class="foot">-- Obrigado! --</div>
  <script>
    window.onload = function () {
      setTimeout(function () { window.print(); }, 150);
      window.onafterprint = function () { window.close(); };
    };
  </script>
</body></html>`;
}

export function printOrderReceipt(order: PrintOrderData): void {
  try {
    const w = window.open('', '_blank', 'width=380,height=640');
    if (!w) {
      console.warn('[print] popup blocked');
      return;
    }
    w.document.open();
    w.document.write(buildReceiptHtml(order));
    w.document.close();
  } catch (e) {
    console.error('[print] failed:', e);
  }
}
