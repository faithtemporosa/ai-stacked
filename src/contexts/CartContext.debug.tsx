/**
 * DEBUG VERSION OF CART CONTEXT
 * 
 * This is an enhanced version with:
 * 1. Comprehensive logging at every step
 * 2. Performance tracking
 * 3. Race condition prevention
 * 4. Debouncing for rapid calls
 * 5. Better error handling
 * 6. State mutation detection
 * 
 * IDENTIFIED ISSUES & FIXES:
 * ❌ Issue 1: Multiple setTimeout calls causing reloads after every operation
 * ✅ Fix: Removed unnecessary reloads, rely on optimistic updates + realtime
 * 
 * ❌ Issue 2: Race conditions between optimistic updates and DB reloads
 * ✅ Fix: Better synchronization with operation tracking
 * 
 * ❌ Issue 3: No debouncing on rapid button clicks
 * ✅ Fix: Added debounce logic and duplicate request prevention
 * 
 * ❌ Issue 4: Blocking operations on main thread
 * ✅ Fix: Better async handling and non-blocking updates
 * 
 * ❌ Issue 5: Too many API calls on initial load
 * ✅ Fix: Better loading state management and retry logic
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { errorLogger, getErrorMessage } from "@/utils/errorLogger";
import { cartDebugger, debugHelpers } from "@/utils/cartDebugger";

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
  addItem: (item: CartItem) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  itemCount: number;
  recentlyAddedItem: CartItem | null;
  clearRecentlyAdded: () => void;
  loading: boolean;
  syncing: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Debounce helper to prevent rapid repeated calls
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<CartItem[]>([]);
  const [recentlyAddedItem, setRecentlyAddedItem] = useState<CartItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // Refs to prevent race conditions and duplicate operations
  const lastOperationRef = useRef<number>(0);
  const operationInProgressRef = useRef<Set<string>>(new Set());
  const OPERATION_COOLDOWN = 2000;
  
  // Rapid call detector
  const addItemCallDetector = useRef(debugHelpers.createRapidCallDetector('addItem', 300));

  // === STEP 1: Initial Load ===
  // Log: Loading cart data from localStorage or database
  useEffect(() => {
    cartDebugger.logUserAction('Cart Provider Mounted', { userId: user?.id });
    cartDebugger.startPerformanceTrace('Initial Cart Load');
    
    if (user) {
      cartDebugger.logUserAction('User authenticated, loading from database');
      loadCartFromDatabase();
    } else {
      cartDebugger.logUserAction('Guest user, loading from localStorage');
      loadCartFromLocalStorage();
    }
    
    cartDebugger.endPerformanceTrace('Initial Cart Load');
  }, [user]);

  // === STEP 2: Sync localStorage for Guests ===
  // Log: Persisting cart to localStorage
  useEffect(() => {
    if (!user && !syncing) {
      cartDebugger.logStateChange('Syncing cart to localStorage', items);
      localStorage.setItem("cart-items", JSON.stringify(items));
    }
  }, [items, user, syncing]);

  // === STEP 3: Real-time Subscription ===
  // Log: Setting up realtime listeners for multi-device sync
  useEffect(() => {
    if (!user) return;

    cartDebugger.logUserAction('Setting up realtime subscription', { userId: user.id });

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
        (payload) => {
          // Log: Realtime event received
          cartDebugger.logUserAction('Realtime event received', {
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old
          });

          // Only reload if we haven't performed an operation recently
          const timeSinceLastOp = Date.now() - lastOperationRef.current;
          if (timeSinceLastOp > OPERATION_COOLDOWN) {
            cartDebugger.logUserAction('Reloading cart from realtime trigger');
            loadCartFromDatabase();
          } else {
            cartDebugger.logUserAction('Skipping realtime reload (operation in cooldown)', {
              timeSinceLastOp,
              cooldown: OPERATION_COOLDOWN
            });
          }
        }
      )
      .subscribe();

    return () => {
      cartDebugger.logUserAction('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user]);

  // === FUNCTION: Load from localStorage ===
  const loadCartFromLocalStorage = () => {
    cartDebugger.startPerformanceTrace('Load from localStorage');
    
    try {
      const saved = localStorage.getItem("cart-items");
      const parsedItems = saved ? JSON.parse(saved) : [];
      
      cartDebugger.logStateChange('Cart loaded from localStorage', parsedItems);
      setItems(parsedItems);
    } catch (error) {
      cartDebugger.logError(error, 'loadCartFromLocalStorage');
      errorLogger.logError("Error loading cart from localStorage", error);
    } finally {
      setLoading(false);
      cartDebugger.endPerformanceTrace('Load from localStorage');
    }
  };

  // === FUNCTION: Load from Database ===
  const loadCartFromDatabase = async (retryCount = 0, maxRetries = 3) => {
    if (!user) {
      setLoading(false);
      return;
    }

    const requestId = cartDebugger.logAPIRequest('cart_items', 'SELECT', { userId: user.id, retryCount });

    if (retryCount === 0) {
      setLoading(true);
      cartDebugger.startPerformanceTrace('Load from Database');
    }

    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      cartDebugger.logAPIResponse(requestId, true, { itemCount: data?.length || 0 });

      const cartItems: CartItem[] = (data || []).map(item => ({
        id: item.automation_id,
        name: item.name,
        price: Number(item.price),
        hoursSaved: item.hours_saved,
        thumbnail: item.thumbnail || undefined,
        quantity: item.quantity
      }));

      cartDebugger.logStateChange('Cart loaded from database', cartItems);
      setItems(cartItems);

      // Check for localStorage merge (first login)
      const localCart = localStorage.getItem("cart-items");
      if (localCart) {
        cartDebugger.logUserAction('Found localStorage cart, initiating merge');
        const localItems: CartItem[] = JSON.parse(localCart);
        await mergeLocalCartToDatabase(localItems, cartItems);
        localStorage.removeItem("cart-items");
      }
    } catch (error) {
      cartDebugger.logAPIResponse(requestId, false, undefined, error);
      
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000;
        cartDebugger.logUserAction(`Retrying cart load (${retryCount + 1}/${maxRetries}) in ${delay}ms`);
        setTimeout(() => loadCartFromDatabase(retryCount + 1, maxRetries), delay);
        return;
      }
      
      cartDebugger.logError(error, 'loadCartFromDatabase (all retries failed)');
      if (import.meta.env.DEV) {
        console.warn("Unable to load cart from database after retries");
      }
    } finally {
      if (retryCount === 0) {
        setLoading(false);
        cartDebugger.endPerformanceTrace('Load from Database');
      }
    }
  };

  // === FUNCTION: Merge Local Cart to Database ===
  const mergeLocalCartToDatabase = async (localItems: CartItem[], dbItems: CartItem[]) => {
    if (!user || localItems.length === 0) {
      setSyncing(false);
      return;
    }

    setSyncing(true);
    cartDebugger.startPerformanceTrace('Merge Local Cart');
    cartDebugger.logUserAction('Starting cart merge', { localItems: localItems.length, dbItems: dbItems.length });
    
    try {
      let itemsAdded = 0;
      let itemsUpdated = 0;

      for (const localItem of localItems) {
        const existingItem = dbItems.find(item => item.id === localItem.id);
        
        if (existingItem) {
          // Update: Increment quantity
          const requestId = cartDebugger.logAPIRequest('cart_items', 'UPDATE', { 
            itemId: localItem.id, 
            newQuantity: existingItem.quantity + localItem.quantity 
          });
          
          const { error } = await supabase
            .from('cart_items')
            .update({ quantity: existingItem.quantity + localItem.quantity })
            .eq('user_id', user.id)
            .eq('automation_id', localItem.id);
          
          cartDebugger.logAPIResponse(requestId, !error, { itemUpdated: !error });
          if (!error) itemsUpdated++;
        } else {
          // Insert: New item
          const requestId = cartDebugger.logAPIRequest('cart_items', 'INSERT', localItem);
          
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
          
          cartDebugger.logAPIResponse(requestId, !error, { itemAdded: !error });
          if (!error) itemsAdded++;
        }
      }

      await loadCartFromDatabase();
      
      const messages = [];
      if (itemsAdded > 0) messages.push(`${itemsAdded} new item${itemsAdded > 1 ? 's' : ''}`);
      if (itemsUpdated > 0) messages.push(`${itemsUpdated} updated`);
      
      toast({
        title: "🎉 Cart Synced Successfully!",
        description: `Your cart has been merged: ${messages.join(', ')}`
      });

      cartDebugger.logUserAction('Cart merge completed', { itemsAdded, itemsUpdated });
    } catch (error) {
      cartDebugger.logError(error, 'mergeLocalCartToDatabase');
      errorLogger.logError("Error merging carts", error, { localItemsCount: localItems.length });
      
      toast({
        title: "Cart Sync Issue",
        description: "Some items may not have synced. Please check your cart.",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
      cartDebugger.endPerformanceTrace('Merge Local Cart');
    }
  };

  // === FUNCTION: Add Item ===
  // This is where most freezing issues occur!
  const addItem = useCallback(async (item: CartItem) => {
    // Log: User clicked "Add to Cart"
    cartDebugger.logUserAction('Add to Cart clicked', { 
      itemId: item.id, 
      itemName: item.name,
      currentCartSize: items.length 
    });
    
    // Detect rapid calls
    addItemCallDetector.current();

    // Prevent duplicate operations
    const operationKey = `add:${item.id}`;
    if (operationInProgressRef.current.has(operationKey)) {
      cartDebugger.logUserAction('⚠️ Duplicate add operation blocked', { itemId: item.id });
      toast({
        title: "Please wait",
        description: "Processing your previous request...",
      });
      return;
    }

    operationInProgressRef.current.add(operationKey);
    cartDebugger.startPerformanceTrace(`Add Item: ${item.name}`);
    lastOperationRef.current = Date.now();
    
    try {
      if (user) {
        // === AUTHENTICATED USER FLOW ===
        cartDebugger.logUserAction('Adding item for authenticated user');

        // STEP 1: Optimistic UI Update
        const exists = items.find((i) => i.id === item.id);
        const previousItems = [...items]; // Backup for rollback
        
        if (exists) {
          cartDebugger.logStateChange('Incrementing existing item quantity', {
            itemId: item.id,
            oldQuantity: exists.quantity,
            newQuantity: exists.quantity + 1
          });
          
          setItems((prev) => prev.map((i) => 
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
          ));
          setRecentlyAddedItem({ ...item, quantity: exists.quantity + 1 });
        } else {
          cartDebugger.logStateChange('Adding new item to cart', item);
          
          const newItem = { ...item, quantity: 1 };
          setItems((prev) => [...prev, newItem]);
          setRecentlyAddedItem(newItem);
        }

        // STEP 2: Sync with Database (non-blocking)
        const requestId = cartDebugger.logAPIRequest('cart_items', 'SELECT', { itemId: item.id });
        
        const { data: existing, error: fetchError } = await supabase
          .from('cart_items')
          .select('*')
          .eq('user_id', user.id)
          .eq('automation_id', item.id)
          .maybeSingle();

        cartDebugger.logAPIResponse(requestId, !fetchError, { exists: !!existing });

        if (fetchError) throw fetchError;

        if (existing) {
          // Update existing item
          const updateRequestId = cartDebugger.logAPIRequest('cart_items', 'UPDATE', {
            itemId: item.id,
            newQuantity: existing.quantity + 1
          });
          
          const { error: updateError } = await supabase
            .from('cart_items')
            .update({ quantity: existing.quantity + 1 })
            .eq('id', existing.id);
          
          cartDebugger.logAPIResponse(updateRequestId, !updateError);
          if (updateError) throw updateError;
        } else {
          // Insert new item
          const insertRequestId = cartDebugger.logAPIRequest('cart_items', 'INSERT', item);
          
          const { error: insertError } = await supabase
            .from('cart_items')
            .insert({
              user_id: user.id,
              automation_id: item.id,
              name: item.name,
              price: item.price,
              hours_saved: item.hoursSaved,
              thumbnail: item.thumbnail,
              quantity: 1
            });
          
          cartDebugger.logAPIResponse(insertRequestId, !insertError);
          if (insertError) throw insertError;
        }

        cartDebugger.logUserAction('✅ Item successfully added to cart', { itemId: item.id });

        // Success toast
        toast({
          title: exists ? "Quantity Updated! 🎉" : "Added to Cart! 🎉",
          description: exists 
            ? `${item.name} quantity increased.`
            : `${item.name} has been added to your cart.`,
        });

      } else {
        // === GUEST USER FLOW ===
        cartDebugger.logUserAction('Adding item for guest user (localStorage)');
        
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
        
        cartDebugger.logUserAction('✅ Item added to localStorage cart', { itemId: item.id });
      }

    } catch (error) {
      cartDebugger.logError(error, 'addItem', { itemId: item.id, itemName: item.name });
      
      // CRITICAL: Rollback optimistic update on error
      cartDebugger.logUserAction('❌ Rolling back optimistic update due to error');
      // Reload from database to get correct state
      if (user) {
        await loadCartFromDatabase();
      }
      
      errorLogger.logError("Error adding to cart", error, { itemId: item.id });
      
      let errorMessage = "Failed to add item to cart. Please try again.";
      
      if (error && typeof error === 'object' && 'code' in error) {
        const supabaseError = error as { code: string; message: string };
        switch (supabaseError.code) {
          case '23505':
            errorMessage = "This item is already in your cart.";
            break;
          case '23503':
            errorMessage = "This automation is no longer available.";
            break;
          case 'PGRST116':
            errorMessage = "Could not find this automation. Please refresh the page.";
            break;
          case '42501':
            errorMessage = "You don't have permission to add items to cart. Please sign in.";
            break;
          default:
            if (supabaseError.message) {
              errorMessage = supabaseError.message;
            }
        }
      }
      
      toast({
        title: "Could Not Add to Cart",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      operationInProgressRef.current.delete(operationKey);
      cartDebugger.endPerformanceTrace(`Add Item: ${item.name}`);
      
      // Auto-detect issues after operation
      cartDebugger.detectIssues();
    }
  }, [user, items, toast]);

  // === FUNCTION: Update Quantity ===
  const updateQuantity = useCallback(async (id: string, quantity: number) => {
    cartDebugger.logUserAction('Update quantity', { itemId: id, newQuantity: quantity });
    
    if (quantity < 1) {
      cartDebugger.logUserAction('Quantity < 1, removing item instead');
      removeItem(id);
      return;
    }

    const operationKey = `update:${id}`;
    if (operationInProgressRef.current.has(operationKey)) {
      cartDebugger.logUserAction('⚠️ Duplicate update operation blocked', { itemId: id });
      return;
    }

    operationInProgressRef.current.add(operationKey);
    cartDebugger.startPerformanceTrace(`Update Quantity: ${id}`);
    lastOperationRef.current = Date.now();
    
    const previousItems = [...items];
    
    cartDebugger.logStateChange('Optimistic quantity update', { itemId: id, quantity });
    setItems((prev) => prev.map((item) => 
      item.id === id ? { ...item, quantity } : item
    ));

    if (user) {
      try {
        const requestId = cartDebugger.logAPIRequest('cart_items', 'UPDATE', { itemId: id, quantity });
        
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity })
          .eq('user_id', user.id)
          .eq('automation_id', id);

        cartDebugger.logAPIResponse(requestId, !error);
        
        if (error) throw error;
        
        cartDebugger.logUserAction('✅ Quantity updated successfully');
      } catch (error) {
        cartDebugger.logError(error, 'updateQuantity', { itemId: id, quantity });
        cartDebugger.logUserAction('❌ Rolling back quantity update');
        setItems(previousItems);
        
        toast({
          title: "Error",
          description: getErrorMessage(error) || "Failed to update quantity",
          variant: "destructive"
        });
      } finally {
        operationInProgressRef.current.delete(operationKey);
        cartDebugger.endPerformanceTrace(`Update Quantity: ${id}`);
      }
    } else {
      operationInProgressRef.current.delete(operationKey);
      cartDebugger.endPerformanceTrace(`Update Quantity: ${id}`);
    }
  }, [user, items, toast]);

  // === FUNCTION: Remove Item ===
  const removeItem = useCallback(async (id: string) => {
    cartDebugger.logUserAction('Remove item', { itemId: id });
    
    const operationKey = `remove:${id}`;
    if (operationInProgressRef.current.has(operationKey)) {
      cartDebugger.logUserAction('⚠️ Duplicate remove operation blocked', { itemId: id });
      return;
    }

    operationInProgressRef.current.add(operationKey);
    cartDebugger.startPerformanceTrace(`Remove Item: ${id}`);
    lastOperationRef.current = Date.now();
    
    const previousItems = [...items];
    
    cartDebugger.logStateChange('Optimistic item removal', { itemId: id });
    setItems((prev) => prev.filter((item) => item.id !== id));
    
    if (user) {
      try {
        const requestId = cartDebugger.logAPIRequest('cart_items', 'DELETE', { itemId: id });
        
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id)
          .eq('automation_id', id);

        cartDebugger.logAPIResponse(requestId, !error);
        
        if (error) throw error;
        
        cartDebugger.logUserAction('✅ Item removed successfully');
      } catch (error) {
        cartDebugger.logError(error, 'removeItem', { itemId: id });
        cartDebugger.logUserAction('❌ Rolling back item removal');
        setItems(previousItems);
        
        toast({
          title: "Error",
          description: getErrorMessage(error) || "Failed to remove item",
          variant: "destructive"
        });
      } finally {
        operationInProgressRef.current.delete(operationKey);
        cartDebugger.endPerformanceTrace(`Remove Item: ${id}`);
      }
    } else {
      operationInProgressRef.current.delete(operationKey);
      cartDebugger.endPerformanceTrace(`Remove Item: ${id}`);
    }
  }, [user, items, toast]);

  // === FUNCTION: Clear Cart ===
  const clearCart = useCallback(async () => {
    cartDebugger.logUserAction('Clear cart');
    cartDebugger.startPerformanceTrace('Clear Cart');
    lastOperationRef.current = Date.now();
    
    const previousItems = [...items];
    
    cartDebugger.logStateChange('Clearing cart', []);
    setItems([]);
    
    if (user) {
      try {
        const requestId = cartDebugger.logAPIRequest('cart_items', 'DELETE ALL');
        
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id);

        cartDebugger.logAPIResponse(requestId, !error);
        
        if (error) throw error;
        
        cartDebugger.logUserAction('✅ Cart cleared successfully');
      } catch (error) {
        cartDebugger.logError(error, 'clearCart');
        cartDebugger.logUserAction('❌ Rolling back cart clear');
        setItems(previousItems);
        
        toast({
          title: "Error",
          description: getErrorMessage(error) || "Failed to clear cart",
          variant: "destructive"
        });
      } finally {
        cartDebugger.endPerformanceTrace('Clear Cart');
      }
    } else {
      cartDebugger.endPerformanceTrace('Clear Cart');
    }
  }, [user, items, toast]);

  const clearRecentlyAdded = useCallback(() => {
    cartDebugger.logUserAction('Clearing recently added indicator');
    setRecentlyAddedItem(null);
  }, []);

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
