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

  // Save cart to database
  const saveAbandonedCart = useCallback(async (data: AbandonedCartData) => {
    if (!data.storeId || data.items.length === 0) return;
    if (!data.customerName.trim() || !data.customerPhone.trim()) return;

    const cartSignature = JSON.stringify({
      items: data.items.map(i => ({ id: i.id, qty: i.quantity })),
      name: data.customerName,
      phone: data.customerPhone,
    });

    if (lastSavedRef.current === cartSignature) return;

    try {
      const formattedItems = data.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      }));

      if (currentCartIdRef.current) {
        const { error } = await supabase
          .from('abandoned_carts')
          .update({
            customer_name: data.customerName,
            customer_phone: data.customerPhone,
            items: formattedItems as unknown as import('@/integrations/supabase/types').Json,
            total: data.total,
          })
          .eq('id', currentCartIdRef.current);

        if (!error) lastSavedRef.current = cartSignature;
      } else {
        const { data: insertedCart, error } = await supabase
          .from('abandoned_carts')
          .insert({
            store_id: data.storeId,
            customer_name: data.customerName,
            customer_phone: data.customerPhone,
            items: formattedItems as unknown as import('@/integrations/supabase/types').Json,
            total: data.total,
          })
          .select('id')
          .single();

        if (!error && insertedCart) {
          currentCartIdRef.current = insertedCart.id;
          lastSavedRef.current = cartSignature;
        }
      }
    } catch (err) {
      console.error('Error saving abandoned cart:', err);
    }
  }, []);

  // Immediate save function (for blur/unload events)
  const saveImmediately = useCallback(() => {
    if (!storeId || items.length === 0) return;
    if (!customerName.trim() || !customerPhone.trim()) return;

    // Clear any pending debounce
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    saveAbandonedCart({
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
    if (!customerName.trim() || !customerPhone.trim()) return;

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

  // Save on page unload (beforeunload + visibilitychange)
  useEffect(() => {
    if (!storeId || items.length === 0) return;
    if (!customerName.trim() || !customerPhone.trim()) return;

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
  }, []);

  // Delete cart if order was placed successfully
  const deleteAbandonedCart = useCallback(async () => {
    if (!currentCartIdRef.current) return;

    try {
      await supabase
        .from('abandoned_carts')
        .update({ recovered_at: new Date().toISOString() })
        .eq('id', currentCartIdRef.current);
    } catch (err) {
      console.error('Error updating abandoned cart:', err);
    }

    clearCartSession();
  }, [clearCartSession]);

  // Mark cart as converted when checkout completes
  const markAsConverted = useCallback(async (orderId: string) => {
    if (!currentCartIdRef.current) return;

    try {
      await supabase
        .from('abandoned_carts')
        .update({
          converted_to_order_id: orderId,
          recovered_at: new Date().toISOString(),
        })
        .eq('id', currentCartIdRef.current);
    } catch (err) {
      console.error('Error marking cart as converted:', err);
    }

    clearCartSession();
  }, [clearCartSession]);

  return {
    markAsConverted,
    deleteAbandonedCart,
    clearCartSession,
    saveImmediately,
  };
}
