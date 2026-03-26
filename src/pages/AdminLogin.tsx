import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { errorLogger, getErrorMessage } from "@/utils/errorLogger";
import { Shield, Lock, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const authSchema = z.object({
  email: z.string()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters")
});

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for both auth and admin checks to complete
    if (authLoading || adminLoading) return;
    if (!user) return;

    if (isAdmin) {
      navigate("/admin");
    } else {
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [user, isAdmin, authLoading, adminLoading, navigate, toast]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      authSchema.parse({ email, password });
      await signIn(email, password);
      // The useEffect above will handle navigation after admin check
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.issues[0].message,
          variant: "destructive",
        });
      } else {
        const errorMessage = getErrorMessage(error);
        errorLogger.logError('Admin sign in failed', error, { email });
        toast({
          title: "Authentication Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <Link 
        to="/" 
        className="absolute top-6 left-6 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 z-10"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <Card className="w-full max-w-md p-8 bg-slate-900/80 backdrop-blur-xl border-slate-700/50 shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Admin Portal
          </h1>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Authorized access only
          </p>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-email" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Admin Email
            </Label>
            <Input
              id="admin-email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-slate-800/50 border-slate-600 focus:border-primary"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Password
            </Label>
            <Input
              id="admin-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-slate-800/50 border-slate-600 focus:border-primary"
            />
          </div>
          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity" 
            disabled={loading}
          >
            {loading ? "Authenticating..." : "Access Admin Portal"}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-700/50">
          <p className="text-xs text-center text-muted-foreground">
            Not an admin? <Link to="/auth" className="text-primary hover:underline">Regular sign in</Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
