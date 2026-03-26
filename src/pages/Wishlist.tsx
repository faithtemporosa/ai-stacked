import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AutomationCard } from "@/components/AutomationCard";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { type Automation } from "@/data/automations";
import { parseAutomationsCatalog } from "@/utils/parseAutomationsCatalog";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Wishlist() {
  const { user } = useAuth();
  const { wishlistIds } = useWishlist();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [savedAutomations, setSavedAutomations] = useState<Automation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    parseAutomationsCatalog().then(data => {
      setAutomations(data);
      setSavedAutomations(data.filter((automation) => wishlistIds.has(automation.id)));
      setIsLoading(false);
    });
  }, [wishlistIds]);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 pt-28 pb-12">
          {isLoading ? (
            <div className="text-center">
              <p className="text-lg text-muted-foreground">Loading...</p>
            </div>
          ) : (
          <div className="text-center space-y-4">
            <Heart className="w-16 h-16 mx-auto text-muted-foreground" />
            <h1 className="text-2xl font-bold">Sign in to view your wishlist</h1>
            <p className="text-muted-foreground">
              Save your favorite automations and access them anytime.
            </p>
            <Button asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>
          )}
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 pt-28 pb-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Wishlist</h1>
          <p className="text-muted-foreground">
            Automations you've saved for later ({savedAutomations.length})
          </p>
        </div>

        {savedAutomations.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <Heart className="w-16 h-16 mx-auto text-muted-foreground" />
            <h2 className="text-2xl font-semibold">Your wishlist is empty</h2>
            <p className="text-muted-foreground">
              Start saving automations you're interested in!
            </p>
            <Button asChild>
              <Link to="/catalog">Browse Automations</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedAutomations.map((automation) => (
              <AutomationCard key={automation.id} automation={automation} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
