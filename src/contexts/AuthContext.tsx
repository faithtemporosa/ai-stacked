import { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { errorLogger } from "@/utils/errorLogger";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    let presenceChannel: ReturnType<typeof supabase.channel> | null = null;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Set up proactive token refresh
      if (session) {
        setupTokenRefresh(session);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Update token refresh timer when session changes
      if (session) {
        setupTokenRefresh(session);
        
        // Set up presence tracking only once when user logs in
        if (!presenceChannel && session.user) {
          presenceChannel = supabase.channel("admin-presence");
          presenceChannel.subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              await presenceChannel?.track({
                user_id: session.user.id,
                online_at: new Date().toISOString(),
              });
            }
          });
        }
      } else {
        clearTokenRefresh();
        // Clean up presence when user logs out
        if (presenceChannel) {
          supabase.removeChannel(presenceChannel);
          presenceChannel = null;
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTokenRefresh();
      if (presenceChannel) {
        supabase.removeChannel(presenceChannel);
      }
    };
  }, []); // Empty dependency array - only run once on mount

  // Proactively refresh token before expiry to prevent logout
  const setupTokenRefresh = (session: Session) => {
    clearTokenRefresh();
    
    if (!session.expires_at) return;
    
    const expiresAt = session.expires_at * 1000;
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    
    // Refresh 10 minutes before expiry for more safety margin
    const refreshTime = Math.max(0, timeUntilExpiry - (10 * 60 * 1000));
    
    refreshTimerRef.current = setTimeout(async () => {
      try {
        errorLogger.logInfo('Refreshing session to prevent auto-logout');
        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
          errorLogger.logError('Failed to refresh session', error);
        } else if (data.session) {
          errorLogger.logInfo('Session refreshed successfully');
          // Set up the next refresh
          setupTokenRefresh(data.session);
        }
      } catch (error) {
        errorLogger.logError('Error refreshing session', error);
      }
    }, refreshTime);
  };

  const clearTokenRefresh = () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`
      }
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // Login activity is now tracked server-side via database trigger
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
