import { createContext, useContext, useState, ReactNode } from 'react';

export interface CartItemModifier {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  modifiers?: CartItemModifier[];
  observation?: string;
  // Unique key combining product id + modifiers for cart deduplication
  cartKey: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity' | 'cartKey'>) => void;
  removeItem: (cartKey: string) => void;
  updateQuantity: (cartKey: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Generate a unique key for cart item based on product + modifiers + observation
function generateCartKey(item: Omit<CartItem, 'quantity' | 'cartKey'>): string {
  const modifierIds = item.modifiers?.map((m) => m.id).sort().join(',') || '';
  const obs = item.observation || '';
  return `${item.id}|${modifierIds}|${obs}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (item: Omit<CartItem, 'quantity' | 'cartKey'>) => {
    const cartKey = generateCartKey(item);
    
    setItems((current) => {
      const existing = current.find((i) => i.cartKey === cartKey);
      if (existing) {
        return current.map((i) =>
          i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...current, { ...item, quantity: 1, cartKey }];
    });
  };

  const removeItem = (cartKey: string) => {
    setItems((current) => current.filter((i) => i.cartKey !== cartKey));
  };

  const updateQuantity = (cartKey: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(cartKey);
      return;
    }
    setItems((current) =>
      current.map((i) => (i.cartKey === cartKey ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => setItems([]);

  // Calculate total including modifiers
  const total = items.reduce((sum, item) => {
    const modifiersTotal = item.modifiers?.reduce((mSum, m) => mSum + m.price, 0) || 0;
    return sum + (item.price + modifiersTotal) * item.quantity;
  }, 0);
  
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, total, itemCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
