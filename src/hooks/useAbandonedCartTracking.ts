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

// Session storage key for tracking current cart session
const CART_SESSION_KEY = 'abandoned_cart_session';

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

  // Generate a unique session ID for this cart session
  const getOrCreateSessionId = useCallback(() => {
    if (!storeId) return null;
    
    const sessionKey = `${CART_SESSION_KEY}_${storeId}`;
    let sessionId = sessionStorage.getItem(sessionKey);
    
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem(sessionKey, sessionId);
    }
    
    return sessionId;
  }, [storeId]);

  // Clear the session when cart is completed
  const clearCartSession = useCallback(() => {
    if (!storeId) return;
    const sessionKey = `${CART_SESSION_KEY}_${storeId}`;
    sessionStorage.removeItem(sessionKey);
    currentCartIdRef.current = null;
    lastSavedRef.current = null;
  }, [storeId]);

  // Save cart to database
  const saveAbandonedCart = useCallback(async (data: AbandonedCartData) => {
    if (!data.storeId || data.items.length === 0) return;
    
    // Only save if we have customer info (they started checkout)
    if (!data.customerName.trim() || !data.customerPhone.trim()) return;

    const cartSignature = JSON.stringify({
      items: data.items.map(i => ({ id: i.id, qty: i.quantity })),
      name: data.customerName,
      phone: data.customerPhone,
    });

    // Don't save if nothing changed
    if (lastSavedRef.current === cartSignature) return;

    try {
      const formattedItems = data.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      }));

      if (currentCartIdRef.current) {
        // Update existing cart
        const { error } = await supabase
          .from('abandoned_carts')
          .update({
            customer_name: data.customerName,
            customer_phone: data.customerPhone,
            items: formattedItems as unknown as import('@/integrations/supabase/types').Json,
            total: data.total,
          })
          .eq('id', currentCartIdRef.current);

        if (error) {
          console.error('Error updating abandoned cart:', error);
        } else {
          lastSavedRef.current = cartSignature;
        }
      } else {
        // Create new cart
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

        if (error) {
          console.error('Error creating abandoned cart:', error);
        } else if (insertedCart) {
          currentCartIdRef.current = insertedCart.id;
          lastSavedRef.current = cartSignature;
        }
      }
    } catch (err) {
      console.error('Error saving abandoned cart:', err);
    }
  }, []);

  // Debounced save - triggers after user stops typing
  useEffect(() => {
    if (!storeId || items.length === 0) return;
    
    // Only track if customer has started filling info
    if (!customerName.trim() || !customerPhone.trim()) return;

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce: save after 2 seconds of inactivity
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

  // Save on page unload (beforeunload event)
  useEffect(() => {
    if (!storeId || items.length === 0) return;
    if (!customerName.trim() || !customerPhone.trim()) return;

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable save on page close
      const formattedItems = items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      }));

      // Note: sendBeacon is fire-and-forget, we can't use supabase client here
      // So we rely on the debounced save which should have already run
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [storeId, items, customerName, customerPhone]);

  // Mark cart as converted when checkout completes
  const markAsConverted = useCallback(async (orderId: string) => {
    if (!currentCartIdRef.current) return;

    try {
      const { error } = await supabase
        .from('abandoned_carts')
        .update({
          converted_to_order_id: orderId,
          recovered_at: new Date().toISOString(),
        })
        .eq('id', currentCartIdRef.current);

      if (error) {
        console.error('Error marking cart as converted:', error);
      }
    } catch (err) {
      console.error('Error marking cart as converted:', err);
    }

    clearCartSession();
  }, [clearCartSession]);

  // Delete cart if order was placed successfully
  const deleteAbandonedCart = useCallback(async () => {
    if (!currentCartIdRef.current) return;

    try {
      // Instead of deleting, just mark as converted so we have a record
      // The AbandonedCartsTab already filters out converted carts
      const { error } = await supabase
        .from('abandoned_carts')
        .update({
          recovered_at: new Date().toISOString(),
        })
        .eq('id', currentCartIdRef.current);

      if (error) {
        console.error('Error updating abandoned cart:', error);
      }
    } catch (err) {
      console.error('Error updating abandoned cart:', err);
    }

    clearCartSession();
  }, [clearCartSession]);

  return {
    markAsConverted,
    deleteAbandonedCart,
    clearCartSession,
  };
}
