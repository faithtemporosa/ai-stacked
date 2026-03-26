// @ts-nocheck
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Sparkles, Rocket, Zap } from "lucide-react";
import confetti from "canvas-confetti";

export function WelcomeDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const checkWelcomeStatus = async () => {
      if (!user) return;

      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("email, has_seen_welcome")
          .eq("user_id", user.id)
          .single();

        if (error) throw error;

        // Show welcome if user hasn't seen it yet
        if (!profile.has_seen_welcome) {
          setUserName(profile.email?.split("@")[0] || "there");
          setOpen(true);
          
          // Trigger confetti after a short delay
          setTimeout(() => {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
            });
          }, 300);
        }
      } catch (error) {
        console.error("Error checking welcome status:", error);
      }
    };

    checkWelcomeStatus();
  }, [user]);

  const handleClose = async () => {
    if (!user) return;

    try {
      // Mark welcome as seen
      await supabase
        .from("profiles")
        .update({ has_seen_welcome: true })
        .eq("user_id", user.id);

      setOpen(false);
    } catch (error) {
      console.error("Error updating welcome status:", error);
      // Close anyway
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px] border-2 border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),transparent)] pointer-events-none" />
        
        <DialogHeader className="relative space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 animate-ping opacity-20">
                <Sparkles className="h-16 w-16 text-primary" />
              </div>
              <Sparkles className="h-16 w-16 text-primary animate-pulse" />
            </div>
          </div>
          
          <DialogTitle className="text-3xl font-bold text-center bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Welcome, {userName}! 🎉
          </DialogTitle>
          
          <DialogDescription className="text-center text-base space-y-4">
            <p className="text-lg font-medium text-foreground">
              You're now part of something amazing!
            </p>
            
            <div className="space-y-3 text-left bg-muted/50 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-start gap-3 group">
                <div className="mt-1 p-2 rounded-full bg-primary/10 group-hover:scale-110 transition-transform">
                  <Rocket className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Explore Automations</h3>
                  <p className="text-sm text-muted-foreground">Browse 2000+ ready-to-use workflows</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 group">
                <div className="mt-1 p-2 rounded-full bg-secondary/10 group-hover:scale-110 transition-transform">
                  <Zap className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Save Time</h3>
                  <p className="text-sm text-muted-foreground">Automate tasks and boost productivity</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 group">
                <div className="mt-1 p-2 rounded-full bg-accent/10 group-hover:scale-110 transition-transform">
                  <Sparkles className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Build Your Stack</h3>
                  <p className="text-sm text-muted-foreground">Add automations to cart and get started</p>
                </div>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="relative flex flex-col gap-3 mt-4">
          <Button 
            onClick={handleClose}
            size="lg"
            className="w-full font-semibold text-lg hover-scale group"
          >
            Let's Get Started! 
            <Rocket className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            Your journey to automation excellence begins now ✨
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
