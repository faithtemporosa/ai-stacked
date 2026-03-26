// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { errorLogger } from "@/utils/errorLogger";

export const useConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = async () => {
    if (isChecking) return;
    
    setIsChecking(true);
    try {
      // Simple health check - try to query a small table
      const { error } = await supabase
        .from('automations')
        .select('id')
        .limit(1);
      
      setIsOnline(!error);
      
      if (error) {
        errorLogger.logWarning("Connection check failed", { error: error.message });
      }
    } catch (error) {
      errorLogger.logWarning("Connection check error", error);
      setIsOnline(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Don't check on mount - only on network changes
    // checkConnection();

    // Check less frequently - every 2 minutes
    const interval = setInterval(checkConnection, 120000);

    // Also check when browser comes back online
    const handleOnline = () => checkConnection();
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return { isOnline, checkConnection, isChecking };
};
