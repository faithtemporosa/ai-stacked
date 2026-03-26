import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { errorLogger, getErrorMessage } from "@/utils/errorLogger";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  hoursSaved: number;
  thumbnail?: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  recentlyAddedItem: CartItem | null;
  clearRecentlyAdded: () => void;
  loading: boolean;
  syncing: boolean; // Expose syncing state for UI feedback
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<CartItem[]>([]);
  const [recentlyAddedItem, setRecentlyAddedItem] = useState<CartItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const lastOperationRef = useRef<number>(0);
  const OPERATION_COOLDOWN = 2000; // 2 second cooldown after operations

  // Load cart from database for authenticated users or localStorage for guests
  useEffect(() => {
    if (user) {
      loadCartFromDatabase();
    } else {
      loadCartFromLocalStorage();
    }
  }, [user]);

  // Sync localStorage for guests
  useEffect(() => {
    if (!user && !syncing) {
      localStorage.setItem("cart-items", JSON.stringify(items));
    }
  }, [items, user, syncing]);

  // Real-time subscription for cart updates across devices
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('cart-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cart_items',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Only reload if we haven't performed an operation recently
          // This prevents race conditions where realtime fires before DB write completes
          const timeSinceLastOp = Date.now() - lastOperationRef.current;
          if (timeSinceLastOp > OPERATION_COOLDOWN) {
            loadCartFromDatabase();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadCartFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem("cart-items");
      setItems(saved ? JSON.parse(saved) : []);
    } catch (error) {
      errorLogger.logError("Error loading cart from localStorage", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCartFromDatabase = useCallback(async (retryCount = 0, maxRetries = 2) => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Set loading to true when starting a fresh load (not a retry)
    if (retryCount === 0) {
      setLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const cartItems: CartItem[] = (data || []).map(item => ({
        id: item.automation_id,
        name: item.name,
        price: Number(item.price),
        hoursSaved: item.hours_saved,
        thumbnail: item.thumbnail || undefined,
        quantity: item.quantity
      }));

      setItems(cartItems);

      // Merge localStorage cart on first login
      const localCart = localStorage.getItem("cart-items");
      if (localCart) {
        const localItems: CartItem[] = JSON.parse(localCart);
        // Await the merge before setting loading to false
        await mergeLocalCartToDatabase(localItems, cartItems);
        localStorage.removeItem("cart-items");
      }
    } catch (error) {
      // Reduced retry with faster backoff
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 500; // Reduced from 1000ms
        setTimeout(() => loadCartFromDatabase(retryCount + 1, maxRetries), delay);
        return;
      }
      // Only log on final failure in dev mode
      if (import.meta.env.DEV) {
        console.warn("Unable to load cart from database after retries");
      }
    } finally {
      setLoading(false); // Always set loading false
    }
  }, [user]);

  /**
   * Merges localStorage cart items into the database when a user authenticates.
   * This function is automatically called when:
   * 1. A guest user signs in/up with items in their cart
   * 2. Items in localStorage are detected during initial database load
   * 
   * Process:
   * - Compares localStorage items with existing database items
   * - Updates quantities for duplicate items
   * - Adds new items that don't exist in database
   * - Clears localStorage after successful merge
   * - Shows success notification with merge details
   */
  const mergeLocalCartToDatabase = async (localItems: CartItem[], dbItems: CartItem[]) => {
    if (!user || localItems.length === 0) {
      setSyncing(false);
      return;
    }

    setSyncing(true);
    const itemsToMerge = localItems.length;
    
    try {
      errorLogger.logInfo('Starting cart migration', { 
        localItems: itemsToMerge, 
        dbItems: dbItems.length 
      });

      let itemsAdded = 0;
      let itemsUpdated = 0;

      for (const localItem of localItems) {
        const existingItem = dbItems.find(item => item.id === localItem.id);
        
        if (existingItem) {
          // Update quantity if item exists
          const { error } = await supabase
            .from('cart_items')
            .update({ quantity: existingItem.quantity + localItem.quantity })
            .eq('user_id', user.id)
            .eq('automation_id', localItem.id);
          
          if (!error) itemsUpdated++;
        } else {
          // Insert new item
          const { error } = await supabase
            .from('cart_items')
            .insert({
              user_id: user.id,
              automation_id: localItem.id,
              name: localItem.name,
              price: localItem.price,
              hours_saved: localItem.hoursSaved,
              thumbnail: localItem.thumbnail,
              quantity: localItem.quantity
            });
          
          if (!error) itemsAdded++;
        }
      }

      await loadCartFromDatabase();
      
      // Show detailed success message
      const messages = [];
      if (itemsAdded > 0) messages.push(`${itemsAdded} new item${itemsAdded > 1 ? 's' : ''}`);
      if (itemsUpdated > 0) messages.push(`${itemsUpdated} updated`);
      
      toast({
        title: "🎉 Cart Synced Successfully!",
        description: `Your cart has been merged: ${messages.join(', ')}`
      });

      errorLogger.logInfo('Cart migration completed', { itemsAdded, itemsUpdated });
    } catch (error) {
      errorLogger.logError("Error merging carts", error, { localItemsCount: localItems.length });
      toast({
        title: "Cart Sync Issue",
        description: "Some items may not have synced. Please check your cart.",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  const addItem = async (item: CartItem) => {
    lastOperationRef.current = Date.now(); // Mark operation time
    
    if (user) {
      // Optimistic update - add to UI immediately
      const exists = items.find((i) => i.id === item.id);
      if (exists) {
        setItems((prev) => prev.map((i) => 
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        ));
        setRecentlyAddedItem({ ...item, quantity: exists.quantity + 1 });
      } else {
        const newItem = { ...item, quantity: 1 };
        setItems((prev) => [...prev, newItem]);
        setRecentlyAddedItem(newItem);
      }

      // Add to database for authenticated users
      try {
        const { data: existing, error: fetchError } = await supabase
          .from('cart_items')
          .select('*')
          .eq('user_id', user.id)
          .eq('automation_id', item.id)
          .maybeSingle(); // Use maybeSingle to handle 0 or 1 results gracefully

        if (fetchError) throw fetchError;

        if (existing) {
          // Item exists, increment quantity
          const { error: updateError } = await supabase
            .from('cart_items')
            .update({ quantity: existing.quantity + 1 })
            .eq('id', existing.id);
          
          if (updateError) throw updateError;
        } else {
          // Get customer name from profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('user_id', user.id)
            .maybeSingle();
          
          // Use username, or fallback to email prefix
          const customerName = profile?.username || 
            (user.email ? user.email.split('@')[0] : null);
          
          // Item doesn't exist, insert new with customer info
          const { error: insertError } = await supabase
            .from('cart_items')
            .insert({
              user_id: user.id,
              automation_id: item.id,
              name: item.name,
              price: item.price,
              hours_saved: item.hoursSaved,
              thumbnail: item.thumbnail,
              quantity: 1,
              customer_name: customerName,
              customer_email: user.email || null
            });
          
          if (insertError) throw insertError;
        }

        // Don't reload - let realtime handle it
      } catch (error) {
        // Revert optimistic update on error
        if (exists) {
          setItems((prev) => prev.map((i) => 
            i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i
          ));
        } else {
          setItems((prev) => prev.filter((i) => i.id !== item.id));
        }
        errorLogger.logError("Error adding to cart", error, { itemId: item.id });
        
        // Handle specific Supabase errors
        let errorMessage = "Failed to add item to cart. Please try again.";
        
        if (error && typeof error === 'object' && 'code' in error) {
          const supabaseError = error as { code: string; message: string };
          switch (supabaseError.code) {
            case '23505': // Unique violation
              errorMessage = "This item is already in your cart.";
              break;
            case '23503': // Foreign key violation
              errorMessage = "This automation is no longer available.";
              break;
            case 'PGRST116': // No rows returned
              errorMessage = "Could not find this automation. Please refresh the page.";
              break;
            case '42501': // Insufficient privileges / RLS
              errorMessage = "You don't have permission to add items to cart. Please sign in.";
              break;
            default:
              if (supabaseError.message) {
                errorMessage = supabaseError.message;
              }
          }
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        
        toast({
          title: "Could Not Add to Cart",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } else {
      // Add to localStorage for guests
      setItems((prev) => {
        const exists = prev.find((i) => i.id === item.id);
        if (exists) {
          setRecentlyAddedItem({ ...exists, quantity: exists.quantity + 1 });
          return prev.map((i) => 
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
          );
        }
        const newItem = { ...item, quantity: 1 };
        setRecentlyAddedItem(newItem);
        return [...prev, newItem];
      });
    }
  };

  const updateQuantity = async (id: string, quantity: number) => {
    lastOperationRef.current = Date.now(); // Mark operation time
    
    if (quantity < 1) {
      removeItem(id);
      return;
    }

    // Optimistic update
    const previousItems = [...items];
    setItems((prev) => prev.map((item) => 
      item.id === id ? { ...item, quantity } : item
    ));

    if (user) {
      try {
        await supabase
          .from('cart_items')
          .update({ quantity })
          .eq('user_id', user.id)
          .eq('automation_id', id);

        // Don't reload - let realtime handle it
      } catch (error) {
        // Revert optimistic update on error
        setItems(previousItems);
        const errorMessage = getErrorMessage(error);
        errorLogger.logError("Error updating quantity", error, { id, quantity });
        toast({
          title: "Error",
          description: errorMessage || "Failed to update quantity",
          variant: "destructive"
        });
      }
    }
  };

  const clearRecentlyAdded = () => {
    setRecentlyAddedItem(null);
  };

  const removeItem = async (id: string) => {
    lastOperationRef.current = Date.now(); // Mark operation time
    
    // Optimistic update
    const previousItems = [...items];
    setItems((prev) => prev.filter((item) => item.id !== id));
    
    if (user) {
      try {
        await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id)
          .eq('automation_id', id);

        // Don't reload - let realtime handle it
      } catch (error) {
        // Revert optimistic update on error
        setItems(previousItems);
        const errorMessage = getErrorMessage(error);
        errorLogger.logError("Error removing item", error, { id });
        toast({
          title: "Error",
          description: errorMessage || "Failed to remove item",
          variant: "destructive"
        });
      }
    }
  };

  const clearCart = async () => {
    lastOperationRef.current = Date.now(); // Mark operation time
    
    // Optimistic update
    const previousItems = [...items];
    setItems([]);
    
    if (user) {
      try {
        await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id);

        // Don't reload - let realtime handle it
      } catch (error) {
        // Revert optimistic update on error
        setItems(previousItems);
        const errorMessage = getErrorMessage(error);
        errorLogger.logError("Error clearing cart", error);
        toast({
          title: "Error",
          description: errorMessage || "Failed to clear cart",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount: items.length,
        recentlyAddedItem,
        clearRecentlyAdded,
        loading,
        syncing,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
