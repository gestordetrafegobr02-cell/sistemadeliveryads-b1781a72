import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Minus, Plus, Trash2, MapPin, Truck, Store, Loader2, AlertTriangle, QrCode, Copy, CheckCircle2, CreditCard, Smartphone } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCart } from '@/lib/cart';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { hapticSuccess } from '@/lib/haptics';
import { getOrderTrackingUrl, getStoreUrl } from '@/lib/siteConfig';
import { z } from 'zod';
import { UpsellModal } from './UpsellModal';
import { useAbandonedCartTracking } from '@/hooks/useAbandonedCartTracking';

// Mercado Pago JS SDK loader (singleton)
declare global { interface Window { MercadoPago?: any; __mpSdkPromise?: Promise<void> } }
function loadMpSdk(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.MercadoPago) return Promise.resolve();
  if (window.__mpSdkPromise) return window.__mpSdkPromise;
  window.__mpSdkPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://sdk.mercadopago.com/js/v2';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('mp_sdk_failed'));
    document.head.appendChild(s);
  });
  return window.__mpSdkPromise;
}

// Best-effort detection of MP payment_method_id from card BIN
function detectCardBrand(num: string): string | null {
  const n = num.replace(/\D/g, '');
  if (!n) return null;
  if (/^4/.test(n)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'master';
  if (/^3[47]/.test(n)) return 'amex';
  if (/^(38|60)/.test(n)) return 'hipercard';
  if (/^(636368|438935|504175|451416|636297|5067|4576|4011|506699)/.test(n)) return 'elo';
  return null;
}

const checkoutSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(100),
  phone: z.string().min(10, 'Telefone inválido').max(20),
  orderType: z.enum(['delivery', 'pickup']),
  zipCode: z.string().max(15).optional(),
  street: z.string().max(200).optional(),
  number: z.string().max(20).optional(),
  neighborhood: z.string().max(100).optional(),
  complement: z.string().max(100).optional(),
  referencePoint: z.string().max(200).optional(),
  paymentMethod: z.enum(['cash', 'card', 'pix']),
  changeFor: z.string().max(20).optional(),
});

interface CartSheetProps {
  storeId?: string;
  storeName?: string;
  storeSlug?: string;
  whatsapp?: string;
  deliveryFee?: number;
  pixKey?: string;
  onPurchase?: () => void;
  onOpen?: () => void;
  isStoreOpen?: boolean;
  checkoutType?: 'whatsapp' | 'direct_cardapio';
}

interface StoreUpsellConfig {
  upsell_enabled: boolean;
  upsell_blocking_categories: string[];
}

interface CheckoutOrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  modifiers: { id: string; name: string; price: number }[];
  observation: string | null;
}

export function CartSheet({ storeId, storeName, storeSlug, whatsapp, deliveryFee = 0, pixKey, onPurchase, onOpen, isStoreOpen = true, checkoutType = 'whatsapp' }: CartSheetProps) {
  if (typeof window !== 'undefined') {
    // Runtime guard: confirms checkout routing prop is bound correctly
    (window as any).__cartCheckoutType = checkoutType;
  }
  const { items, updateQuantity, removeItem, total, itemCount, clearCart } = useCart();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [upsellConfig, setUpsellConfig] = useState<StoreUpsellConfig | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [zipCode, setZipCode] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [complement, setComplement] = useState('');
  const [referencePoint, setReferencePoint] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'pix'>('pix');
  const [paymentFlow, setPaymentFlow] = useState<'online' | 'on_delivery'>('online');
  const [changeFor, setChangeFor] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ===== Native Mercado Pago Transparent Checkout =====
  const [onlineMethod, setOnlineMethod] = useState<'pix' | 'card'>('pix');
  // PIX modal state
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [pixData, setPixData] = useState<{
    paymentId: string;
    orderId: string;
    sessionToken: string | null;
    qrCode: string;
    qrCodeBase64: string;
  } | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const pollRef = useRef<number | null>(null);
  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState(''); // MM/YY
  const [cardCvv, setCardCvv] = useState('');
  const [mpPublicKey, setMpPublicKey] = useState<string | null>(null);
  const mpRef = useRef<any>(null);

  // Fetch the store's MP public key when needed for card tokenization
  useEffect(() => {
    if (checkoutType !== 'direct_cardapio' || !storeSlug || mpPublicKey) return;
    if (paymentFlow !== 'online' || onlineMethod !== 'card') return;
    (async () => {
      try {
        const { data } = await supabase.rpc('get_public_store_by_slug', { store_slug: storeSlug });
        const pk = (data as any[])?.[0]?.mercadopago_public_key;
        if (pk) {
          setMpPublicKey(pk);
          await loadMpSdk();
          if (window.MercadoPago) {
            mpRef.current = new window.MercadoPago(pk, { locale: 'pt-BR' });
          }
        }
      } catch (e) {
        console.warn('[MP] public key fetch failed', e);
      }
    })();
  }, [checkoutType, storeSlug, mpPublicKey, paymentFlow, onlineMethod]);

  // Cleanup polling on unmount
  useEffect(() => () => { if (pollRef.current) window.clearInterval(pollRef.current); }, []);



  // Abandoned cart tracking
  const cartItemsForTracking = items.map(item => ({
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
  }));
  
  const { markAsConverted, saveImmediately } = useAbandonedCartTracking(
    storeId,
    cartItemsForTracking,
    total,
    name,
    phone
  );

  // Fetch upsell config when store loads
  useEffect(() => {
    async function fetchUpsellConfig() {
      if (!storeId) return;
      
      try {
        const { data: storeData, error } = await supabase
          .from('stores')
          .select('upsell_enabled')
          .eq('id', storeId)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching upsell config:', error);
          // Default to enabled to attempt upsell via RPC
          setUpsellConfig({ upsell_enabled: true, upsell_blocking_categories: [] });
          return;
        }
        
        if (storeData) {
          setUpsellConfig({
            upsell_enabled: storeData.upsell_enabled ?? false,
            upsell_blocking_categories: [], // Not needed anymore, RPC handles it
          });
        } else {
          // Store not found or not accessible, try upsell anyway via RPC
          setUpsellConfig({ upsell_enabled: true, upsell_blocking_categories: [] });
        }
      } catch (err) {
        console.error('Upsell config fetch error:', err);
        setUpsellConfig({ upsell_enabled: true, upsell_blocking_categories: [] });
      }
    }
    fetchUpsellConfig();
  }, [storeId]);

  // Smart upsell check: returns true if upsell should be shown
  async function shouldShowUpsell(): Promise<boolean> {
    // Basic checks
    if (!upsellConfig?.upsell_enabled) return false;
    if (!storeId || items.length === 0) return false;

    const productIds = items.map((item) => item.id);

    // Use the RPC function which already handles all the logic
    // (blocking categories, exceptions, and finding available products)
    const { data: upsellProducts, error } = await supabase
      .rpc('get_personalized_upsell', { 
        p_store_id: storeId, 
        p_cart_product_ids: productIds,
        p_limit: 3 
      });

    if (error) {
      console.error('Error checking upsell:', error);
      return false;
    }

    // Show upsell modal only if there are products to suggest
    return upsellProducts && upsellProducts.length > 0;
  }

  async function handleProceedToCheckout() {
    if (!validateCheckoutForm()) return;

    // Only pre-open a tab for WhatsApp mode (browsers require it inside the click handler)
    const isWhatsAppFlow = checkoutType !== 'direct_cardapio' || paymentFlow === 'on_delivery'
      ? checkoutType !== 'direct_cardapio'
      : false;
    const pendingWhatsAppWindow = isWhatsAppFlow ? window.open('about:blank', '_blank') : null;

    const showUpsell = await shouldShowUpsell();
    if (showUpsell) {
      pendingWhatsAppWindow?.close();
      setUpsellOpen(true);
    } else {
      handleCheckout(pendingWhatsAppWindow);
    }
  }

  const paymentLabels = {
    cash: 'Dinheiro',
    card: 'Cartão na Entrega',
    pix: 'PIX',
  };

  // Calculate totals
  const subtotal = total;
  const deliveryAmount = orderType === 'delivery' ? deliveryFee : 0;
  const grandTotal = subtotal + deliveryAmount;

  // Generate proper UUID for order (server-side trigger validates and enriches)
  const generateOrderId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    // Fallback RFC4122 v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };


  useEffect(() => {
    if (open && onOpen) {
      onOpen();
    }
  }, [open, onOpen]);

  const validateCheckoutForm = () => {
    const validationData = {
      name,
      phone,
      orderType,
      paymentMethod,
      ...(orderType === 'delivery' && {
        zipCode,
        street,
        number,
        neighborhood,
        complement,
        referencePoint,
      }),
      ...(paymentMethod === 'cash' && { changeFor }),
    };

    if (orderType === 'delivery' && (!street.trim() || !number.trim() || !neighborhood.trim())) {
      setErrors({ address: 'Preencha rua, número e bairro para entrega' });
      return false;
    }

    const result = checkoutSchema.safeParse(validationData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleCheckout = async (pendingWhatsAppWindow?: Window | null) => {
    if (!validateCheckoutForm()) {
      pendingWhatsAppWindow?.close();
      return;
    }

    const isMpOnline = checkoutType === 'direct_cardapio' && paymentFlow === 'online';
    const isMpOnDelivery = checkoutType === 'direct_cardapio' && paymentFlow === 'on_delivery';
    const checkoutWindow = (checkoutType === 'direct_cardapio')
      ? null
      : (pendingWhatsAppWindow ?? window.open('about:blank', '_blank'));
    setSubmitting(true);

    // Build address string
    let addressStr = '';
    if (orderType === 'delivery') {
      addressStr = `${street}, ${number}`;
      if (complement) addressStr += ` - ${complement}`;
      addressStr += `, ${neighborhood}`;
      if (zipCode) addressStr += ` - CEP: ${zipCode}`;
      if (referencePoint) addressStr += ` | Ref: ${referencePoint}`;
    }

    const orderId = generateOrderId();
    const phoneDigits = phone.replace(/\D/g, '');
    const storePhoneDigits = whatsapp?.replace(/\D/g, '') || '';
    const orderItems: CheckoutOrderItem[] = items.map((item) => {
      const modifiers = (item.modifiers || []).map((modifier) => ({
        id: modifier.id,
        name: modifier.name,
        price: modifier.price,
      }));
      const modifiersTotal = modifiers.reduce((sum, modifier) => sum + modifier.price, 0);
      const lineTotal = (item.price + modifiersTotal) * item.quantity;

      return {
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        lineTotal,
        modifiers,
        observation: item.observation || null,
      };
    });

    let trackingUrl = '';
    let storeShareUrl = '';
    let savedOrderId = orderId;
    let sessionToken: string | null = null;
    const cleanStoreSlug = storeSlug
      ? storeSlug.trim().toLowerCase().replace(/[\u200B-\u200D\uFEFF\s]/g, '')
      : '';

    if (cleanStoreSlug) {
      storeShareUrl = getStoreUrl(cleanStoreSlug);
    }

    // For Mercado Pago ONLINE payments, do NOT create the order yet.
    // The edge function stashes a pending_orders row; the webhook promotes it
    // to a real order only when MP reports `approved`. This prevents phantom
    // orders, the merchant buzzer/WhatsApp alert, and dashboard noise before
    // the customer actually pays.
    let pendingCartId: string | null = null;
    if (storeId && isMpOnline) {
      // Still capture abandoned cart so recovery can chase non-payers
      try { pendingCartId = await saveImmediately(); } catch (_) { /* ignore */ }
    } else if (storeId) {
      try {
        const cartId = await saveImmediately();

        const { data: createdOrder, error: orderError } = await supabase.rpc('create_public_order', {
          p_order_id: orderId,
          p_store_id: storeId,
          p_customer_name: name,
          p_customer_phone: phoneDigits || phone,
          p_items: orderItems.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.unitPrice,
            modifiers: item.modifiers,
            observation: item.observation,
          })) as unknown as import('@/integrations/supabase/types').Json,
          p_address: addressStr || null,
          p_payment_method: isMpOnDelivery ? 'on_delivery' : paymentMethod,
          p_client_total: grandTotal,
          p_cart_id: cartId || undefined,
        });

        if (orderError || !createdOrder?.[0]) {
          console.error('[Order] insert error:', orderError);
          setErrors({ submit: `Erro ao salvar pedido: ${orderError?.message || 'pedido não retornou confirmação'}` });
          checkoutWindow?.close();
          setSubmitting(false);
          return;
        }

        savedOrderId = createdOrder[0].order_id;
        sessionToken = createdOrder[0].customer_session_token;
        trackingUrl = getOrderTrackingUrl(savedOrderId, sessionToken);
        await markAsConverted(savedOrderId);

      } catch (err) {
        console.error('[Order] save exception:', err);
        setErrors({ submit: 'Erro inesperado ao salvar pedido.' });
        checkoutWindow?.close();
        setSubmitting(false);
        return;
      }
    }

    const internalTrackingUrl = `/pedido/${savedOrderId}${sessionToken ? `?token=${encodeURIComponent(sessionToken)}` : ''}`;

    // ===== Mercado Pago direct checkout branches =====
    if (checkoutType === 'direct_cardapio') {
      onPurchase?.();
      clearCart();
      setOpen(false);

      if (isMpOnDelivery) {
        // Fire merchant WhatsApp alert (on-delivery doesn't redirect through WA)
        try {
          if (storePhoneDigits) {
            const alertMsg = encodeURIComponent(
              '🚨 *Novo Pedido Recebido!* Mais um pedido foi gerado no seu Cardápio Digital. Acesse seu painel administrativo para iniciar o preparo!'
            );
            window.open(`https://wa.me/${storePhoneDigits}?text=${alertMsg}`, '_blank');
          }
        } catch (e) {
          console.warn('[merchant-alert] failed', e);
        }
        setSubmitting(false);
        window.location.assign(internalTrackingUrl);
        return;
      }

      // ===== NATIVE TRANSPARENT CHECKOUT (PIX or CARD via /v1/payments) =====
      try {
        if (phoneDigits) {
          localStorage.setItem(
            `mp_paid_stash_${savedOrderId}`,
            JSON.stringify({
              phone: phoneDigits,
              trackingUrl: `${window.location.origin}/${cleanStoreSlug}/pedido/${savedOrderId}`,
              storePhone: storePhoneDigits || '',
            }),
          );
        }
      } catch (_) { /* ignore */ }

      const baseBody = {
        storeId,
        orderId: savedOrderId,
        amount: Number(grandTotal.toFixed(2)),
        payerName: name,
        payerPhone: phoneDigits || phone,
        description: `Pedido ${storeName || 'Cardapio'}`,
        customer: {
          name,
          phone: phoneDigits || phone,
          address: addressStr || null,
          orderItems: orderItems.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.unitPrice,
            modifiers: item.modifiers,
            observation: item.observation,
          })),
          total: grandTotal,
          cartId: pendingCartId || null,
        },
      };

      const fail = (msg: string) => {
        toast.error(msg);
        setErrors({ submit: msg });
        setSubmitting(false);
      };

      try {
        let invokeBody: Record<string, unknown>;

        if (onlineMethod === 'pix') {
          invokeBody = { ...baseBody, paymentType: 'pix' };
        } else {
          // CARD: tokenize via MP.js, then send token
          if (!mpRef.current) {
            try { await loadMpSdk(); } catch { /* ignore */ }
            if (window.MercadoPago && mpPublicKey) {
              mpRef.current = new window.MercadoPago(mpPublicKey, { locale: 'pt-BR' });
            }
          }
          if (!mpRef.current) return fail('Não foi possível inicializar o pagamento por cartão.');
          const numClean = cardNumber.replace(/\D/g, '');
          const [mm, yy] = cardExpiry.split('/').map((s) => s.trim());
          if (!numClean || numClean.length < 13 || !cardHolder.trim() || !mm || !yy || !cardCvv) {
            return fail('Preencha todos os dados do cartão.');
          }
          let tokenRes: any;
          try {
            tokenRes = await mpRef.current.createCardToken({
              cardNumber: numClean,
              cardholderName: cardHolder.trim(),
              cardExpirationMonth: mm,
              cardExpirationYear: yy.length === 2 ? `20${yy}` : yy,
              securityCode: cardCvv,
            });
          } catch (e) {
            console.error('[MP] tokenize error', e);
            return fail('Cartão inválido. Verifique os dados.');
          }
          if (!tokenRes?.id) return fail('Cartão inválido. Verifique os dados.');
          const brand = detectCardBrand(numClean) || 'visa';
          invokeBody = {
            ...baseBody,
            paymentType: 'card',
            cardToken: tokenRes.id,
            installments: 1,
            paymentMethodId: brand,
          };
        }

        console.log('[MP] /v1/payments request →', { type: invokeBody.paymentType, orderId: savedOrderId });
        const { data: mpData, error: mpError } = await supabase.functions.invoke('mercadopago-create-preference', {
          body: invokeBody,
        });
        console.log('[MP] /v1/payments response ←', { mpError, mpData });

        if (mpError) return fail('Erro ao processar pagamento. Tente novamente.');
        if (!mpData || (mpData as { error?: string }).error) {
          return fail((mpData as { message?: string })?.message || 'Erro ao processar pagamento.');
        }

        const resp = mpData as {
          status?: string;
          qr_code?: string;
          qr_code_base64?: string;
          payment_id?: string;
        };

        // PIX → render QR modal + start polling
        if (onlineMethod === 'pix') {
          if (!resp.qr_code || !resp.qr_code_base64) {
            return fail('Não foi possível gerar o PIX. Tente novamente.');
          }
          setPixData({
            paymentId: String(resp.payment_id || ''),
            orderId: savedOrderId,
            sessionToken,
            qrCode: resp.qr_code,
            qrCodeBase64: resp.qr_code_base64,
          });
          setPixModalOpen(true);
          setSubmitting(false);

          // Poll get_order_by_id every 4s for status=Pago
          if (pollRef.current) window.clearInterval(pollRef.current);
          pollRef.current = window.setInterval(async () => {
            try {
              const { data: ord } = await supabase.rpc('get_order_by_id', { p_order_id: savedOrderId });
              const row = (ord as any[])?.[0];
              if (row) {
                // Order was promoted by webhook → payment succeeded
                if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
                hapticSuccess();
                onPurchase?.();
                clearCart();
                setPixModalOpen(false);
                window.location.assign(internalTrackingUrl);
              }
            } catch (e) { /* swallow */ }
          }, 4000);
          return;
        }

        // CARD → if approved, jump to tracking; if pending, poll briefly
        if (resp.status === 'approved') {
          hapticSuccess();
          onPurchase?.();
          clearCart();
          setOpen(false);
          setSubmitting(false);
          window.location.assign(internalTrackingUrl);
          return;
        }
        if (resp.status === 'in_process' || resp.status === 'pending') {
          toast.message('Pagamento em análise. Aguardando confirmação...');
          if (pollRef.current) window.clearInterval(pollRef.current);
          pollRef.current = window.setInterval(async () => {
            try {
              const { data: ord } = await supabase.rpc('get_order_by_id', { p_order_id: savedOrderId });
              if ((ord as any[])?.[0]) {
                if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
                onPurchase?.();
                clearCart();
                window.location.assign(internalTrackingUrl);
              }
            } catch (_) {}
          }, 4000);
          setSubmitting(false);
          return;
        }
        return fail('Pagamento recusado. Tente outro cartão.');
      } catch (err) {
        console.error('[MP] invoke exception', err);
        toast.error('Erro ao processar pagamento. Tente novamente.');
        setErrors({ submit: 'Erro ao processar pagamento. Tente novamente.' });
        setSubmitting(false);
      }
      return;
    }





    const shortId = savedOrderId.slice(0, 8).toUpperCase();
    const itemLines = orderItems
      .map((item) => {
        const modifierLines = item.modifiers.length > 0
          ? `\n${item.modifiers.map((modifier) => `   ↳ ${modifier.name} (+R$ ${modifier.price.toFixed(2).replace('.', ',')})`).join('\n')}`
          : '';
        const observationLine = item.observation ? `\n   📝 ${item.observation}` : '';
        return `• ${item.quantity}x ${item.name} — R$ ${item.lineTotal.toFixed(2).replace('.', ',')}${modifierLines}${observationLine}`;
      })
      .join('\n');

    const safeStoreName = storeName?.trim() || 'Restaurante';
    let message = `🧾 *COMANDA ${safeStoreName}*\n`;
    message += `🏪 *Pedido #${shortId}*\n\n`;
    message += `*Cliente:* ${name}\n`;
    message += `*Telefone:* ${phoneDigits || phone}\n`;
    message += `*Tipo:* ${orderType === 'delivery' ? 'Entrega' : 'Retirada'}\n\n`;
    message += `*Itens do Pedido:*\n${itemLines}\n\n`;
    message += `*Resumo:*\n`;
    message += `Subtotal: R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;
    if (orderType === 'delivery') {
      message += `Taxa de entrega: R$ ${deliveryAmount.toFixed(2).replace('.', ',')}\n`;
    }
    message += `*TOTAL:* R$ ${grandTotal.toFixed(2).replace('.', ',')}\n\n`;
    message += `*Pagamento:* ${paymentLabels[paymentMethod]}`;
    if (paymentMethod === 'cash' && changeFor) message += ` (troco para R$ ${changeFor})`;
    if (paymentMethod === 'pix' && pixKey) message += `\n*Chave PIX:* ${pixKey}`;

    if (orderType === 'delivery') {
      message += `\n\n*Endereço de Entrega:*\n`;
      message += `${street}, ${number}`;
      if (complement) message += ` - ${complement}`;
      message += `\n${neighborhood}`;
      if (zipCode) message += `\nCEP: ${zipCode}`;
      if (referencePoint) message += `\nReferência: ${referencePoint}`;
    }

    if (storeShareUrl) {
      message += `\n\n*Loja:*\n${storeShareUrl}`;
    }

    if (trackingUrl) {
      message += `\n\n*Rastreamento ao vivo:*\n${trackingUrl}`;
    }

    if (!storePhoneDigits) {
      setErrors({ submit: 'A loja ainda não configurou o WhatsApp para receber pedidos.' });
      checkoutWindow?.close();
      setSubmitting(false);
      return;
    }

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${storePhoneDigits}?text=${encodedMessage}`;
    // internalTrackingUrl already computed above
    const openWhatsAppTab = () => {
      try {
        if (checkoutWindow && !checkoutWindow.closed) {
          checkoutWindow.location.href = whatsappUrl;
          checkoutWindow.focus?.();
          return true;
        }
      } catch (error) {
        console.warn('[Checkout] unable to reuse pre-opened WhatsApp tab:', error);
      }

      const fallbackWindow = window.open(whatsappUrl, '_blank');
      fallbackWindow?.focus?.();
      return Boolean(fallbackWindow);
    };

    onPurchase?.();
    clearCart();
    setSubmitting(false);
    setOpen(false);

    const whatsappOpened = openWhatsAppTab();
    if (!whatsappOpened) {
      setErrors({ submit: 'Seu navegador bloqueou a abertura do WhatsApp. Libere pop-ups e tente novamente.' });
      return;
    }

    window.setTimeout(() => {
      window.location.assign(internalTrackingUrl);
    }, 180);
  };


  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {/* Mobile: Fixed bottom bar, Desktop: Floating button */}
        <div className="fixed bottom-0 left-0 right-0 z-50 sm:bottom-6 sm:left-auto sm:right-6 sm:w-auto">
          {/* Mobile bottom bar */}
          <div className="sm:hidden glass-card border-t border-border/50 p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center relative">
                <ShoppingCart className="w-5 h-5 text-primary-foreground" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {itemCount > 0 ? `${itemCount} ${itemCount === 1 ? 'item' : 'itens'}` : 'Carrinho vazio'}
                </p>
                {itemCount > 0 && (
                  <p className="text-primary font-semibold">
                    R$ {total.toFixed(2).replace('.', ',')}
                  </p>
                )}
              </div>
            </div>
            <Button className="btn-glow bg-primary text-primary-foreground px-6">
              Ver Carrinho
            </Button>
          </div>

          {/* Desktop floating button */}
          <Button
            size="lg"
            className="hidden sm:flex rounded-full w-16 h-16 btn-glow animate-pulse-glow bg-primary text-primary-foreground shadow-2xl"
          >
            <ShoppingCart className="w-6 h-6" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground w-6 h-6 rounded-full text-sm font-bold flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Button>
        </div>
      </SheetTrigger>
      <SheetContent className="bg-card border-border w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl text-foreground flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary" />
            Seu Carrinho
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <ShoppingCart className="w-16 h-16 mb-4 opacity-50" />
            <p>Seu carrinho está vazio</p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Cart Items */}
            <div className="space-y-4">
              {items.map((item) => {
                const modifiersTotal = item.modifiers?.reduce((sum, m) => sum + m.price, 0) || 0;
                const itemTotal = (item.price + modifiersTotal) * item.quantity;
                
                return (
                  <div
                    key={item.cartKey}
                    className="flex items-start gap-3 p-3 glass-card animate-fade-in"
                  >
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">{item.name}</h4>
                      {/* Show modifiers */}
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {item.modifiers.map((m) => (
                            <span key={m.id} className="block">
                              + {m.name} (R$ {m.price.toFixed(2).replace('.', ',')})
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Show observation */}
                      {item.observation && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          Obs: {item.observation}
                        </p>
                      )}
                      <p className="text-primary font-semibold mt-1">
                        R$ {itemTotal.toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="w-8 h-8"
                        onClick={() => updateQuantity(item.cartKey, item.quantity - 1)}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-6 text-center font-medium">{item.quantity}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="w-8 h-8"
                        onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-8 h-8 text-destructive hover:text-destructive"
                        onClick={() => removeItem(item.cartKey)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Checkout Form */}
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label htmlFor="name" className="text-foreground">Nome Completo</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => saveImmediately()}
                    placeholder="Seu nome completo"
                    className="mt-1 bg-secondary border-border"
                  />
                  {errors.name && <p className="text-destructive text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <Label htmlFor="phone" className="text-foreground">Telefone / WhatsApp</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onBlur={() => saveImmediately()}
                    placeholder="(11) 99999-9999"
                    className="mt-1 bg-secondary border-border"
                  />
                  {errors.phone && <p className="text-destructive text-sm mt-1">{errors.phone}</p>}
                </div>
              </div>

              {/* Order Type Toggle */}
              <div className="p-4 glass-card rounded-lg">
                <Label className="text-foreground mb-3 block">Tipo de Pedido</Label>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant={orderType === 'delivery' ? 'default' : 'outline'}
                    className={`flex-1 gap-2 ${orderType === 'delivery' ? 'bg-primary text-primary-foreground' : ''}`}
                    onClick={() => setOrderType('delivery')}
                  >
                    <Truck className="w-4 h-4" />
                    Entrega
                  </Button>
                  <Button
                    type="button"
                    variant={orderType === 'pickup' ? 'default' : 'outline'}
                    className={`flex-1 gap-2 ${orderType === 'pickup' ? 'bg-primary text-primary-foreground' : ''}`}
                    onClick={() => setOrderType('pickup')}
                  >
                    <Store className="w-4 h-4" />
                    Retirada
                  </Button>
                </div>
              </div>

              {/* Address Fields - Only show for delivery */}
              {orderType === 'delivery' && (
                <div className="space-y-3 p-4 glass-card rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <Label className="text-foreground font-medium">Endereço de Entrega</Label>
                  </div>
                  
                  {errors.address && <p className="text-destructive text-sm">{errors.address}</p>}

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <Input
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        placeholder="CEP"
                        className="bg-secondary border-border"
                      />
                    </div>
                    <div>
                      <Input
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        placeholder="Nº"
                        className="bg-secondary border-border"
                      />
                    </div>
                  </div>

                  <Input
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Rua / Avenida"
                    className="bg-secondary border-border"
                  />

                  <Input
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Bairro"
                    className="bg-secondary border-border"
                  />

                  <Input
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    placeholder="Complemento (apto, bloco...)"
                    className="bg-secondary border-border"
                  />

                  <Input
                    value={referencePoint}
                    onChange={(e) => setReferencePoint(e.target.value)}
                    placeholder="Ponto de referência"
                    className="bg-secondary border-border"
                  />
                </div>
              )}

              {/* Mercado Pago: choose Online vs On-Delivery */}
              {checkoutType === 'direct_cardapio' && (
                <div>
                  <Label className="text-foreground">Forma de Pagamento</Label>
                  <RadioGroup
                    value={paymentFlow}
                    onValueChange={(v) => setPaymentFlow(v as 'online' | 'on_delivery')}
                    className="mt-2 space-y-2"
                  >
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-secondary border border-primary/30">
                      <RadioGroupItem value="online" id="pf-online" />
                      <Label htmlFor="pf-online" className="cursor-pointer flex-1">
                        <span className="font-medium">Pagar Online</span>
                        <span className="block text-xs text-muted-foreground">Cartão de Crédito, Débito ou Pix</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-secondary">
                      <RadioGroupItem value="on_delivery" id="pf-on-delivery" />
                      <Label htmlFor="pf-on-delivery" className="cursor-pointer flex-1">
                        <span className="font-medium">Pagar na Entrega</span>
                        <span className="block text-xs text-muted-foreground">Pague ao receber o pedido</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Payment Method (hidden when paying online via MP) */}
              {!(checkoutType === 'direct_cardapio' && paymentFlow === 'online') && (
                <div>
                  <Label className="text-foreground">
                    {checkoutType === 'direct_cardapio' ? 'Pagamento na Entrega — Como?' : 'Forma de Pagamento'}
                  </Label>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={(v) => setPaymentMethod(v as 'cash' | 'card' | 'pix')}
                    className="mt-2 space-y-2"
                  >
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-secondary">
                      <RadioGroupItem value="pix" id="pix" />
                      <Label htmlFor="pix" className="cursor-pointer flex-1">PIX</Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-secondary">
                      <RadioGroupItem value="card" id="card" />
                      <Label htmlFor="card" className="cursor-pointer flex-1">Cartão na Entrega</Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-secondary">
                      <RadioGroupItem value="cash" id="cash" />
                      <Label htmlFor="cash" className="cursor-pointer flex-1">Dinheiro</Label>
                    </div>
                  </RadioGroup>

                  {/* Change For - Only show for cash */}
                  {paymentMethod === 'cash' && (
                    <div className="mt-3">
                      <Label htmlFor="changeFor" className="text-foreground">Troco para quanto?</Label>
                      <Input
                        id="changeFor"
                        value={changeFor}
                        onChange={(e) => setChangeFor(e.target.value)}
                        placeholder="Ex: 50,00"
                        className="mt-1 bg-secondary border-border"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Totals */}
              <div className="py-4 border-t border-border space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                {orderType === 'delivery' && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Taxa de Entrega</span>
                    <span>R$ {deliveryAmount.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-lg font-medium text-foreground">Total</span>
                  <span className="text-2xl font-display text-primary">
                    R$ {grandTotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              {!isStoreOpen && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg mb-3">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">
                    A loja está fechada no momento. Não é possível finalizar pedidos.
                  </p>
                </div>
              )}

              {errors.submit && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">{errors.submit}</p>
                </div>
              )}

              <Button
                onClick={() => {
                  hapticSuccess();
                  handleProceedToCheckout();
                }}
                disabled={submitting || !isStoreOpen}
                className="w-full btn-glow bg-primary text-primary-foreground hover:bg-primary/90 h-14 text-lg font-display disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                {!isStoreOpen
                  ? 'Loja Fechada'
                  : checkoutType === 'direct_cardapio'
                    ? (submitting && paymentFlow === 'online' ? 'Gerando link de pagamento...' : 'Finalizar pedido')
                    : 'Confirmar Pedido via WhatsApp'}
              </Button>
            </div>
          </div>
        )}

        {/* Upsell Modal */}
        {storeId && (
          <UpsellModal
            open={upsellOpen}
            onOpenChange={setUpsellOpen}
            storeId={storeId}
            onContinue={handleCheckout}
          />
        )}
      </SheetContent>

    </Sheet>

  );
}
