import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface AbandonedCartData {
  storeId: string;
  customerName: string;
  customerPhone: string;
  items: CartItem[];
  total: number;
}

export function useAbandonedCartTracking(
  storeId: string | undefined,
  items: CartItem[],
  total: number,
  customerName: string,
  customerPhone: string
) {
  const lastSavedRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentCartIdRef = useRef<string | null>(null);
  const lastPhoneRef = useRef<string | null>(null);

  const normalizedPhone = (value: string) => value.replace(/\\D/g, '').slice(0, 15);
  const hasValidPhone = (value: string) => normalizedPhone(value).length >= 10 && normalizedPhone(value).length <= 15;

  // Save cart via secure RPC
  const saveAbandonedCart = useCallback(async (data: AbandonedCartData): Promise<string | null> => {
    if (!data.storeId || data.items.length === 0) return null;
    const phone = normalizedPhone(data.customerPhone);
    if (data.customerName.trim().length < 2 || !hasValidPhone(data.customerPhone)) return null;
    if (lastPhoneRef.current !== phone) {
      currentCartIdRef.current = null;
      lastSavedRef.current = null;
      lastPhoneRef.current = phone;
    }

    const cartSignature = JSON.stringify({
      items: data.items.map(i => ({ id: i.id, qty: i.quantity })),
      name: data.customerName,
      phone: data.customerPhone,
    });

    if (lastSavedRef.current === cartSignature) return currentCartIdRef.current;

    try {
      const formattedItems = data.items.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      }));

      const { data: cartId, error } = await supabase.rpc('upsert_abandoned_cart', {
        p_cart_id: currentCartIdRef.current || undefined,
        p_store_id: data.storeId,
        p_customer_name: data.customerName,
        p_customer_phone: phone,
        p_items: formattedItems as any,
        p_total: data.total,
      });

      if (!error && cartId) {
        currentCartIdRef.current = cartId;
        lastSavedRef.current = cartSignature;
        return cartId;
      }
    } catch (err) {
      console.error('Error saving abandoned cart:', err);
    }

    return currentCartIdRef.current;
  }, []);

  // Immediate save function (for blur/unload events)
  const saveImmediately = useCallback(async (): Promise<string | null> => {
    if (!storeId || items.length === 0) return null;
    if (customerName.trim().length < 2 || !hasValidPhone(customerPhone)) return null;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    return saveAbandonedCart({
      storeId,
      customerName,
      customerPhone,
      items,
      total,
    });
  }, [storeId, items, total, customerName, customerPhone, saveAbandonedCart]);

  // Debounced save - triggers after user stops typing
  useEffect(() => {
    if (!storeId || items.length === 0) return;
    if (customerName.trim().length < 2 || !hasValidPhone(customerPhone)) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveAbandonedCart({
        storeId,
        customerName,
        customerPhone,
        items,
        total,
      });
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [storeId, items, total, customerName, customerPhone, saveAbandonedCart]);

  // Save on page unload
  useEffect(() => {
    if (!storeId || items.length === 0) return;
    if (customerName.trim().length < 2 || !hasValidPhone(customerPhone)) return;

    const handleUnload = () => saveImmediately();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveImmediately();
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [saveImmediately]);

  // Clear the session when cart is completed
  const clearCartSession = useCallback(() => {
    currentCartIdRef.current = null;
    lastSavedRef.current = null;
    lastPhoneRef.current = null;
  }, []);

  // Conversion is performed atomically by create_public_order after it validates
  // the cart id, store and customer phone. Do not expose the ID-only mutation RPC.
  const deleteAbandonedCart = useCallback(async () => {
    clearCartSession();
  }, [clearCartSession]);

  const markAsConverted = useCallback(async (_orderId: string) => {
    clearCartSession();
  }, [clearCartSession]);

  return {
    markAsConverted,
    deleteAbandonedCart,
    clearCartSession,
    saveImmediately,
  };
}
