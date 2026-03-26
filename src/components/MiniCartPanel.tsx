import { useEffect } from "react";
import { Link } from "react-router-dom";
import { X, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function MiniCartPanel() {
  const { recentlyAddedItem, clearRecentlyAdded } = useCart();

  useEffect(() => {
    if (recentlyAddedItem) {
      const timer = setTimeout(() => {
        clearRecentlyAdded();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [recentlyAddedItem, clearRecentlyAdded]);

  return (
    <Sheet open={!!recentlyAddedItem} onOpenChange={(open) => !open && clearRecentlyAdded()}>
      <SheetContent side="right" className="w-[90vw] sm:w-[400px] bg-card border-l border-primary/20">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-card-foreground">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Added to Cart
          </SheetTitle>
        </SheetHeader>
        
        {recentlyAddedItem && (
          <div className="mt-6 space-y-4">
            <div className="bg-muted/50 p-4 rounded-2xl border border-primary/10">
              <div className="flex gap-4">
                <img 
                  src={recentlyAddedItem.thumbnail || "/placeholder.svg"} 
                  alt={recentlyAddedItem.name}
                  className="w-20 h-20 rounded-xl object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-card-foreground mb-1">
                    {recentlyAddedItem.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {recentlyAddedItem.hoursSaved} hours saved/month
                  </p>
                  <p className="text-primary font-bold">
                    ${recentlyAddedItem.price.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Link to="/cart" onClick={clearRecentlyAdded}>
                <Button variant="retro" className="w-full">
                  View Cart
                </Button>
              </Link>
              <Button 
                variant="outline" 
                className="w-full text-foreground hover:text-primary-foreground"
                onClick={clearRecentlyAdded}
              >
                Continue Shopping
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
