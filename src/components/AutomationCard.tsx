import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TrendingUp, Check, Heart, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import type { Automation } from "@/data/automations";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { useParticleTrail } from "@/hooks/use-particle-trail";
import { useHapticFeedback } from "@/hooks/use-haptic-feedback";
import { useWishlist } from "@/contexts/WishlistContext";
import { useRef, useEffect } from "react";
import { toLaymanDescription } from "@/utils/laymanDescriptions";

interface AutomationCardProps {
  automation: Automation;
  lastUpdated?: string;
}

const isNew = (dateString?: string) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 7;
};

export const AutomationCard = ({ automation, lastUpdated }: AutomationCardProps) => {
  const isNewAutomation = isNew(lastUpdated);
  const { addItem, items } = useCart();
  const { toast } = useToast();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isInCart = items.some((item) => item.id === automation.id);
  const isSaved = isInWishlist(automation.id);
  const addToCartRef = useParticleTrail({
    color: isInCart ? "hsl(var(--secondary))" : "hsl(var(--primary))",
    size: 5,
    lifetime: 800,
    particlesPerMove: 3,
  });

  const { elementRef: hapticRef, createRipple } = useHapticFeedback({
    rippleColor: isInCart ? "hsl(var(--secondary) / 0.4)" : "hsl(var(--primary) / 0.4)",
    rippleDuration: 600,
    scaleAmount: 0.95,
  });

  // Use a single ref for both effects
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (buttonRef.current) {
      addToCartRef.current = buttonRef.current;
      hapticRef.current = buttonRef.current;
    }
  }, [addToCartRef, hapticRef]);

  const handleAddToCart = async (e: React.MouseEvent<HTMLButtonElement>) => {
    createRipple(e);
    
    const cartItem = items.find((item) => item.id === automation.id);
    
    try {
      await addItem({
        id: automation.id,
        name: automation.name,
        price: 99,
        hoursSaved: automation.hoursSaved,
        thumbnail: automation.thumbnail,
        quantity: 1,
      });

      // Only show success toast after item is successfully added
      toast({
        title: cartItem ? "Quantity Updated! 🎉" : "Added to Cart! 🎉",
        description: cartItem 
          ? `${automation.name} quantity increased to ${cartItem.quantity + 1}.`
          : `${automation.name} has been added to your cart.`,
      });
    } catch (error) {
      // CartContext already handles error toasts, no need to show duplicate
      console.error('Failed to add to cart:', error);
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-6 space-y-4 relative">
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-2 right-2 z-10"
          onClick={() => toggleWishlist(automation.id)}
        >
          <Heart className={`w-4 h-4 ${isSaved ? "fill-current text-red-500" : ""}`} />
        </Button>
        <div className="space-y-2 pr-12">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="w-fit">
              {automation.category}
            </Badge>
            {isNewAutomation && (
              <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 animate-pulse">
                <Sparkles className="w-3 h-3 mr-1" />
                New
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-lg leading-tight">{automation.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {toLaymanDescription(automation.description || '', automation.name, automation.category)}
          </p>
        </div>
        
        <div className="space-y-2">

          <div className="flex items-center justify-between">
            <Badge variant="outline" className="w-fit">
              ROI: {automation.roiLevel}
            </Badge>
            <div className="text-lg font-bold">
              $99<span className="text-sm text-muted-foreground font-normal">/mo</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button asChild variant="outline" className="flex-1 text-sm">
            <Link to={`/automation/${automation.id}`}>View Details</Link>
          </Button>
          <Button 
            ref={buttonRef}
            onClick={handleAddToCart}
            className="flex-1 text-sm"
            variant={isInCart ? "secondary" : "default"}
          >
            {isInCart ? (
              <>
                <Check className="w-4 h-4 mr-1" />
                In Cart
              </>
            ) : (
              "Add to Cart"
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};
