// @ts-nocheck
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { useToast } from "@/hooks/use-toast";

interface WishlistContextType {
  wishlistIds: Set<string>;
  isInWishlist: (automationId: string) => boolean;
  toggleWishlist: (automationId: string) => Promise<void>;
  loading: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider = ({ children }: { children: React.ReactNode }) => {
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadWishlist();
    } else {
      setWishlistIds(new Set());
      setLoading(false);
    }
  }, [user]);

  const loadWishlist = async (retryCount = 0, maxRetries = 2) => {
    try {
      const { data, error } = await supabase
        .from("wishlists")
        .select("automation_id");

      if (error) throw error;

      const ids = new Set(data?.map((item) => item.automation_id) || []);
      setWishlistIds(ids);
    } catch (error) {
      // Silent retry with faster backoff
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 500;
        setTimeout(() => loadWishlist(retryCount + 1, maxRetries), delay);
        return;
      }
      // Only log on final failure in dev mode
      if (import.meta.env.DEV) {
        console.warn("Unable to load wishlist after retries");
      }
    } finally {
      if (retryCount === 0) {
        setLoading(false);
      }
    }
  };

  const isInWishlist = (automationId: string) => {
    return wishlistIds.has(automationId);
  };

  const toggleWishlist = async (automationId: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save automations to your wishlist.",
        variant: "destructive",
      });
      return;
    }

    const isCurrentlyInWishlist = wishlistIds.has(automationId);

    try {
      if (isCurrentlyInWishlist) {
        const { error } = await supabase
          .from("wishlists")
          .delete()
          .eq("user_id", user.id)
          .eq("automation_id", automationId);

        if (error) throw error;

        setWishlistIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(automationId);
          return newSet;
        });

        toast({
          title: "Removed from wishlist",
          description: "Automation removed from your saved items.",
        });
      } else {
        const { error } = await supabase
          .from("wishlists")
          .insert({ user_id: user.id, automation_id: automationId });

        if (error) throw error;

        setWishlistIds((prev) => new Set(prev).add(automationId));

        toast({
          title: "Added to wishlist! 💖",
          description: "Automation saved for later.",
        });
      }
    } catch (error) {
      console.error("Error toggling wishlist:", error);
      toast({
        title: "Error",
        description: "Failed to update wishlist. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <WishlistContext.Provider value={{ wishlistIds, isInWishlist, toggleWishlist, loading }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
};
