import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkedUserId, setCheckedUserId] = useState<string | null>(null);

  useEffect(() => {
    // Always reset when user changes
    if (user?.id !== checkedUserId) {
      setLoading(true);
      setIsAdmin(false);
    }

    const checkAdminStatus = async (retryCount = 0, maxRetries = 3) => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        setCheckedUserId(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (error) throw error;

        setIsAdmin(!!data);
        setCheckedUserId(user.id);
        setLoading(false);
      } catch (error) {
        if (retryCount < maxRetries) {
          const delay = Math.pow(2, retryCount) * 500;
          setTimeout(() => checkAdminStatus(retryCount + 1, maxRetries), delay);
          return;
        }
        console.warn("Unable to check admin status after retries");
        setIsAdmin(false);
        setCheckedUserId(user.id);
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user?.id]); // Only depend on user.id, not checkedUserId

  // Return loading=true if we haven't checked this user yet
  const isLoading = loading || (user?.id !== checkedUserId);

  return { isAdmin, loading: isLoading };
};
