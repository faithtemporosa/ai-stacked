// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";
import { z } from "zod";
import { errorLogger, getErrorMessage } from "../utils/errorLogger";
import { supabase } from "../integrations/supabase/client";
import { Gift, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const authSchema = z.object({
  email: z.string()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character")
});

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref');

  useEffect(() => {
    // Store referral code in localStorage when visiting with ref param
    if (referralCode) {
      localStorage.setItem('referral_code', referralCode);
    }
  }, [referralCode]);

  useEffect(() => {
    if (!authLoading && user) {
      // Track referral after signup
      const storedRef = localStorage.getItem('referral_code');
      if (storedRef) {
        trackReferral(storedRef);
      }
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  const trackReferral = async (code: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.functions.invoke('affiliate-api', {
        body: { action: 'track_referral_signup', referral_code: code },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      localStorage.removeItem('referral_code');
    } catch (error) {
      console.error('Error tracking referral:', error);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      authSchema.parse({ email, password });
      await signIn(email, password);
      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
      });
      navigate("/");
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.issues[0].message,
          variant: "destructive",
        });
      } else {
        const errorMessage = getErrorMessage(error);
        errorLogger.logError('Sign in failed', error, { email });
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      authSchema.parse({ email, password });
      await signUp(email, password);
      toast({
        title: "Account created!",
        description: "You've successfully signed up and are now logged in.",
      });
      navigate("/");
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.issues[0].message,
          variant: "destructive",
        });
      } else {
        const errorMessage = getErrorMessage(error);
        errorLogger.logError('Sign up failed', error, { email });
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const storedRef = localStorage.getItem('referral_code') || referralCode;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 pt-28 pb-12">
        <div className="w-full max-w-md space-y-6">
          <Card className="p-6">
            {storedRef && (
            <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              <span className="text-sm">
                Signing up with referral code: <strong>{storedRef}</strong>
              </span>
            </div>
          )}
          <Tabs defaultValue={referralCode ? "signup" : "signin"} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Must be 8+ characters with uppercase, lowercase, number, and special character
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating account..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          </Card>

          {/* Affiliate Program Benefits */}
          <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/20">
                <Gift className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">Become an Affiliate</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Earn <span className="text-primary font-medium">25% recurring commission</span> for 12 months on every referral. Your referrals get 10% off their first purchase!
                </p>
                <Button 
                  variant="link" 
                  className="h-auto p-0 text-xs mt-2"
                  onClick={() => navigate('/affiliate')}
                >
                  Learn more about our affiliate program →
                </Button>
              </div>
            </div>
          </Card>

          {/* Admin Login Link */}
          <div className="text-center">
            <Link 
              to="/admin/login" 
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Shield className="w-3.5 h-3.5" />
              Admin Login
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
