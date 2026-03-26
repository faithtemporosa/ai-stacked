// @ts-nocheck
import { useState, useEffect, useRef, useMemo } from "react";
import confetti from "canvas-confetti";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { FuturisticBackground } from "../components/FuturisticBackground";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Checkbox } from "../components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Progress } from "../components/ui/progress";
import { Link } from "react-router-dom";
import { X, Check, TrendingDown, ShoppingCart, LogIn, Trash2, Gift, Zap } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import { toLaymanDescription } from "../utils/laymanDescriptions";
import { useQuery } from "@tanstack/react-query";

const UPSELLS = [
  { id: "priority-support", name: "Priority Support", price: 200, description: "24/7 priority response" },
  { id: "custom-automation", name: "Custom Automation Design", price: 1000, description: "One custom workflow" },
  { id: "monthly-optimization", name: "Monthly Optimization Upgrade", price: 300, description: "Weekly reviews & improvements" }
];

export default function Cart() {
  const { user } = useAuth();
  const { items: cartItems, removeItem, clearCart, loading, syncing } = useCart();
  const [selectedUpsells, setSelectedUpsells] = useState<string[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const { toast } = useToast();
  const previousTierRef = useRef<number>(0);

  // Fetch automation details for descriptions
  const automationIds = useMemo(() => cartItems.map(item => item.id), [cartItems]);
  
  const { data: automationDetails } = useQuery({
    queryKey: ["cart-automation-details", automationIds],
    queryFn: async () => {
      if (automationIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from("automations")
        .select("id, description, category")
        .in("id", automationIds);
      
      if (error) throw error;
      
      return (data || []).reduce((acc, item) => {
        acc[item.id] = { description: item.description, category: item.category };
        return acc;
      }, {} as Record<string, { description: string | null; category: string }>);
    },
    enabled: automationIds.length > 0,
  });

  // Referral discount state
  const [hasReferralDiscount, setHasReferralDiscount] = useState(false);
  const [referralDiscountApplied, setReferralDiscountApplied] = useState(false);

  // Intake form state
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");

  // Check if user has referral discount available
  useEffect(() => {
    const checkReferralDiscount = async () => {
      if (!user) {
        setHasReferralDiscount(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('referred_by, referral_discount_applied')
        .eq('user_id', user.id)
        .single();

      if (profile?.referred_by && !profile.referral_discount_applied) {
        // Check if affiliate is active using secure function
        const { data: isActive } = await supabase
          .rpc('check_affiliate_active', { affiliate_id: profile.referred_by });

        setHasReferralDiscount(isActive === true);
        setReferralDiscountApplied(profile.referral_discount_applied ?? false);
      } else {
        setHasReferralDiscount(false);
        setReferralDiscountApplied(profile?.referral_discount_applied ?? false);
      }
    };

    checkReferralDiscount();
  }, [user]);

  const DISCOUNT_TIERS = [
    { min: 1, max: 1, rate: 0, label: "Standard", price: 99 },
    { min: 2, max: 3, rate: 0.10, label: "Volume Saver", price: 89 },
    { min: 4, max: 6, rate: 0.20, label: "Business Bundle", price: 79 },
    { min: 7, max: 10, rate: 0.30, label: "Enterprise Pack", price: 69 },
    { min: 11, max: Infinity, rate: 0.40, label: "Maximum Savings", price: 59 }
  ];

  const calculatePricing = () => {
    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const currentTier = DISCOUNT_TIERS.find(tier => totalQuantity >= tier.min && totalQuantity <= tier.max);
    const discountRate = currentTier?.rate || 0;
    const basePrice = 99;
    const effectivePrice = currentTier?.price || basePrice;
    const subtotal = totalQuantity * effectivePrice;
    const discount = (totalQuantity * basePrice) - subtotal;
    
    const upsellsTotal = UPSELLS
      .filter(u => selectedUpsells.includes(u.id))
      .reduce((sum, u) => sum + u.price, 0);
    
    // Calculate referral discount (10% off total after volume discount)
    const afterVolumeDiscount = subtotal + upsellsTotal;
    const referralDiscountAmount = hasReferralDiscount ? afterVolumeDiscount * 0.10 : 0;
    
    const total = afterVolumeDiscount - referralDiscountAmount;
    const totalHoursSaved = cartItems.reduce((sum, item) => sum + (item.hoursSaved * item.quantity), 0);

    const nextTier = DISCOUNT_TIERS.find(tier => tier.min > totalQuantity);
    const automationsUntilNextTier = nextTier ? nextTier.min - totalQuantity : 0;

    return { 
      subtotal, 
      discount, 
      upsellsTotal, 
      total, 
      discountRate, 
      totalHoursSaved,
      currentTier,
      nextTier,
      automationsUntilNextTier,
      totalQuantity,
      basePrice,
      referralDiscountAmount,
      hasReferralDiscount
    };
  };

  const handleRemoveItem = (id: string) => {
    removeItem(id);
    toast({
      title: "Item Removed",
      description: "Automation removed from cart"
    });
  };

  const handleClearCart = () => {
    clearCart();
    setShowClearDialog(false);
    toast({
      title: "Cart Cleared",
      description: "All items have been removed from your cart"
    });
  };

  const toggleUpsell = (id: string) => {
    setSelectedUpsells(prev =>
      prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]
    );
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isProcessingCheckout) return; // Prevent double submission
    
    setIsProcessingCheckout(true);
    
    // Import supabase
    const { supabase } = await import("../integrations/supabase/client");
    
    try {
      console.log('Starting checkout with:', {
        email,
        quantity: pricing.totalQuantity,
        businessName
      });

      // Show immediate feedback
      toast({
        title: "Creating Checkout Session",
        description: "Please wait while we prepare your payment..."
      });

      // Create Stripe checkout session
      const { data, error: sessionError } = await supabase.functions.invoke(
        'create-checkout-session',
        {
          body: {
            userId: user?.id,
            email: email,
            quantity: pricing.totalQuantity,
            businessName: businessName,
            website: website,
            additionalInfo: additionalInfo,
            cartItems: cartItems.map(item => ({ name: item.name, id: item.id })),
          }
        }
      );

      console.log('Edge function response:', { data, error: sessionError });

      if (sessionError) {
        console.error('Session error:', sessionError);
        throw sessionError;
      }

      if (!data) {
        throw new Error('No response data from checkout session');
      }

      // The edge function returns the data directly
      const checkoutUrl = data.url;
      
      console.log('Checkout URL:', checkoutUrl);

      if (!checkoutUrl) {
        throw new Error('No checkout URL in response');
      }

      toast({
        title: "Redirecting to Payment",
        description: "Taking you to secure checkout..."
      });

      // Redirect to Stripe checkout
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Checkout error details:', error);
      setIsProcessingCheckout(false); // Re-enable button on error
      toast({
        title: "Checkout Error",
        description: error instanceof Error ? error.message : "Failed to create checkout session. Please try again.",
        variant: "destructive"
      });
    }
  };

  const pricing = calculatePricing();

  // Confetti effect when unlocking new tier
  useEffect(() => {
    const currentTierIndex = DISCOUNT_TIERS.findIndex(
      tier => tier.min === pricing.currentTier?.min
    );
    
    if (currentTierIndex > previousTierRef.current && previousTierRef.current !== 0 && pricing.currentTier) {
      // Trigger confetti animation
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = window.setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);
        
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      toast({
        title: "🎉 New Tier Unlocked!",
        description: `You've reached ${pricing.currentTier.label} - ${Math.round(pricing.discountRate * 100)}% off!`
      });
    }
    
    previousTierRef.current = currentTierIndex;
  }, [pricing.currentTier, pricing.discountRate, toast]);

  if (showCheckout) {
    // Require authentication for checkout
    if (!user) {
      return (
        <div className="min-h-screen flex flex-col relative">
          <FuturisticBackground />
          <Header />
          <main className="flex-1 container mx-auto px-4 pt-28 pb-12">
            <div className="max-w-2xl mx-auto">
              <Card className="p-12 text-center space-y-6">
                <div className="flex justify-center">
                  <div className="rounded-full bg-primary/10 p-6">
                    <LogIn className="w-12 h-12 text-primary" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Sign In to Complete Your Order</h2>
                  <p className="text-muted-foreground">
                    Create an account or sign in to proceed with checkout and manage your automations.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button asChild size="lg" className="gap-2">
                    <Link to="/auth">
                      <LogIn className="w-4 h-4" />
                      Sign In to Continue
                    </Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={() => setShowCheckout(false)}
                  >
                    Back to Cart
                  </Button>
                </div>
              </Card>
            </div>
          </main>
          <Footer />
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col relative">
        <FuturisticBackground />
        <Header />
        <main className="flex-1 container mx-auto px-4 pt-28 pb-12">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold mb-8">Setup Information</h1>
            
            <Card className="p-8">
              <form onSubmit={handleCheckout} className="space-y-6">
                <div>
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                    placeholder="Acme Inc."
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@company.com"
                  />
                </div>

                <div>
                  <Label htmlFor="website">Website (Optional)</Label>
                  <Input
                    id="website"
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://yourwebsite.com"
                  />
                </div>

                <div>
                  <Label htmlFor="additionalInfo">Tell us about your goals</Label>
                  <Textarea
                    id="additionalInfo"
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    placeholder="What are you hoping to achieve with these automations?"
                    rows={4}
                  />
                </div>

                <div className="bg-muted/50 p-6 rounded-lg">
                  <h3 className="font-semibold mb-4">Order Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal ({cartItems.length} automations)</span>
                      <span>${pricing.subtotal.toFixed(2)}</span>
                    </div>
                    {pricing.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Volume Discount ({Math.round(pricing.discountRate * 100)}% off)</span>
                        <span>-${pricing.discount.toFixed(2)}</span>
                      </div>
                    )}
                    {hasReferralDiscount && (
                      <div className="flex justify-between text-green-600">
                        <span className="flex items-center gap-1">
                          <Gift className="w-3 h-3" />
                          Referral Discount (10% off)
                        </span>
                        <span>-${pricing.referralDiscountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <Separator className="my-2" />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>${pricing.total.toFixed(2)}/month</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCheckout(false)}
                    className="flex-1"
                    disabled={isProcessingCheckout}
                  >
                    Back to Cart
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 gradient-primary"
                    disabled={isProcessingCheckout}
                  >
                    {isProcessingCheckout ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      'Complete Setup'
                    )}
                  </Button>
                </div>
              </form>
            </Card>

            <div className="mt-8 text-center text-sm text-muted-foreground">
              <p className="mb-3 text-xs italic">Your checkout link will adjust automatically based on your total automations.</p>
              <p className="mb-2">After payment, we'll contact you within 24 hours to:</p>
              <ul className="space-y-1">
                <li>• Connect your accounts and tools</li>
                <li>• Configure your automations</li>
                <li>• Schedule your go-live date</li>
              </ul>
              <p className="mt-4">If you have any questions, please contact us at <a href="mailto:marketing@thebumpteam.com" className="text-primary hover:underline">marketing@thebumpteam.com</a></p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Require authentication only at checkout time, not for viewing cart

  return (
    <div className="min-h-screen flex flex-col relative">
      <FuturisticBackground />
      <Header />
      
      <main className="flex-1 container mx-auto px-4 pt-28 pb-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold">Your Cart</h1>
            {cartItems.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClearDialog(true)}
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
                Clear Cart
              </Button>
            )}
          </div>

          {/* Referral Discount Banner */}
          {hasReferralDiscount && cartItems.length > 0 && (
            <Card className="mb-6 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-500/20 p-2">
                  <Gift className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-700 dark:text-green-400">
                    🎉 10% Referral Discount Applied!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your friend referred you - enjoy 10% off your first purchase!
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Syncing Indicator */}
          {syncing && (
            <Card className="mb-6 p-4 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                <div>
                  <p className="font-medium">Syncing your cart...</p>
                  <p className="text-sm text-muted-foreground">Merging items from your previous session</p>
                </div>
              </div>
            </Card>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-6">
              {loading ? (
                <Card className="p-12 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                  <p className="text-muted-foreground mt-4">Loading your cart...</p>
                </Card>
              ) : cartItems.length === 0 ? (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground mb-4">Your cart is empty</p>
                  <Button asChild>
                    <Link to="/catalog">Browse Automations</Link>
                  </Button>
                </Card>
              ) : (
                <>
                  {/* Cart Items List */}
                  <div className="space-y-4">
                    {cartItems.map((item) => {
                      const details = automationDetails?.[item.id];
                      const laymanDescription = details?.description 
                        ? toLaymanDescription(details.description, item.name, details.category)
                        : null;
                      
                      return (
                        <Card key={item.id} className="p-4 sm:p-6">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
                              {laymanDescription && (
                                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                  {laymanDescription}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                <span>{item.hoursSaved}h saved/month</span>
                                <span className="hidden sm:inline">•</span>
                                <span>$99/month</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                              <span className="font-semibold min-w-[60px] sm:min-w-[80px] text-right">$99</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-destructive hover:text-destructive shrink-0"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>

                   {/* Progress to Next Tier */}
                  {pricing.nextTier && (
                    <Card className="p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-sm text-muted-foreground">Current Tier</h4>
                            <p className="text-lg font-bold text-foreground">{pricing.currentTier?.label}</p>
                          </div>
                          <div className="text-right">
                            <h4 className="font-semibold text-sm text-muted-foreground">Next Tier</h4>
                            <p className="text-lg font-bold text-primary">{pricing.nextTier.label}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {pricing.totalQuantity} of {pricing.nextTier.min} automations
                            </span>
                            <span className="font-semibold text-primary">
                              {pricing.automationsUntilNextTier} more to unlock {Math.round(pricing.nextTier.rate * 100)}% off
                            </span>
                          </div>
                          
                          <Progress 
                            value={(pricing.totalQuantity / pricing.nextTier.min) * 100} 
                            className="h-3 animate-fade-in"
                          />
                          
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Save ${pricing.discount.toFixed(0)} now</span>
                            <span className="text-primary font-semibold">
                              Save ${((pricing.totalQuantity + pricing.automationsUntilNextTier) * pricing.basePrice * pricing.nextTier.rate).toFixed(0)} at next tier
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}

                   {/* Volume Discount Tiers */}
                  <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Zap className="w-5 h-5 text-primary" />
                        Volume Pricing
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        Save up to 40%
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add more automations to unlock bigger discounts
                    </p>
                    <div className="space-y-2">
                      {DISCOUNT_TIERS.map((tier, index) => {
                        const isActive = pricing.totalQuantity >= tier.min && pricing.totalQuantity <= tier.max;
                        const isPast = pricing.totalQuantity > tier.max;
                        const isFuture = pricing.totalQuantity < tier.min;
                        const basePrice = 99;
                        const savingsPerItem = basePrice - tier.price;
                        
                        return (
                          <div
                            key={index}
                            className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                              isActive 
                                ? 'bg-primary/20 border-2 border-primary shadow-md ring-1 ring-primary/30' 
                                : isPast 
                                ? 'bg-muted/30 opacity-50' 
                                : 'bg-background/50 border border-border hover:border-primary/30 hover:bg-primary/5'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                isActive 
                                  ? 'bg-primary text-primary-foreground' 
                                  : isPast 
                                  ? 'bg-muted text-muted-foreground' 
                                  : 'bg-muted/50 text-muted-foreground'
                              }`}>
                                {isActive ? (
                                  <Check className="w-4 h-4" />
                                ) : (
                                  <span className="text-xs font-bold">{index + 1}</span>
                                )}
                              </div>
                              <div>
                                <div className="font-medium flex items-center gap-2">
                                  {tier.label}
                                  {isActive && <Badge className="text-xs bg-primary text-primary-foreground">Current</Badge>}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {tier.min === tier.max 
                                    ? `${tier.min} automation`
                                    : tier.max === Infinity
                                    ? `${tier.min}+ automations`
                                    : `${tier.min}-${tier.max} automations`
                                  }
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-bold text-lg ${isActive ? 'text-primary' : ''}`}>
                                ${tier.price}<span className="text-xs font-normal text-muted-foreground">/ea</span>
                              </div>
                              {tier.rate > 0 ? (
                                <div className="text-xs text-green-600 font-medium">
                                  Save ${savingsPerItem}/ea ({Math.round(tier.rate * 100)}% off)
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground">
                                  Base price
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                </>
              )}
            </div>

            {/* Summary Sidebar */}
            <div className="lg:col-span-1">
              <Card className="p-4 sm:p-6 lg:sticky lg:top-24">
                <h3 className="font-semibold text-lg mb-4">Order Summary</h3>
                
                <div className="space-y-3 text-sm mb-6">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Automations ({cartItems.length})
                    </span>
                    <span className="font-medium">${pricing.subtotal.toFixed(2)}</span>
                  </div>
                  
                   {pricing.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4" />
                        {pricing.currentTier?.label} Discount
                        <Badge variant="secondary" className="ml-1">
                          {Math.round(pricing.discountRate * 100)}% off
                        </Badge>
                      </span>
                      <span className="font-medium">-${pricing.discount.toFixed(2)}</span>
                    </div>
                  )}

                   {pricing.nextTier && pricing.automationsUntilNextTier > 0 && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-md">
                      <span>Add {pricing.automationsUntilNextTier} more to unlock {Math.round(pricing.nextTier.rate * 100)}% off</span>
                      <Badge variant="outline" className="text-xs">
                        Save ${((pricing.totalQuantity + pricing.automationsUntilNextTier) * pricing.basePrice * pricing.nextTier.rate - pricing.discount).toFixed(0)}
                      </Badge>
                    </div>
                  )}

                  {/* Referral Discount Display */}
                  {hasReferralDiscount && (
                    <div className="flex justify-between text-green-600 bg-green-50 dark:bg-green-950/30 px-3 py-2 rounded-md">
                      <span className="flex items-center gap-2">
                        <Gift className="w-4 h-4" />
                        Referral Discount
                        <Badge className="bg-green-600 text-white text-xs">
                          10% off
                        </Badge>
                      </span>
                      <span className="font-medium">-${pricing.referralDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}

                </div>

                <Separator className="my-4" />

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${pricing.total.toFixed(2)}/month</span>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <Check className="w-4 h-4 inline mr-1 text-green-600" />
                    Saves you {pricing.totalHoursSaved} hours/month
                  </div>
                </div>

                <Button
                  onClick={() => setShowCheckout(true)}
                  disabled={cartItems.length === 0}
                  className="w-full gradient-primary shadow-glow"
                  size="lg"
                >
                  Continue to Setup
                </Button>

                <div className="mt-4 pt-4 border-t text-xs text-muted-foreground space-y-2">
                  <p>• 24-72 hour deployment</p>
                  <p>• Fully managed & optimized</p>
                  <p>• Cancel anytime</p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Clear Cart Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear your cart?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} from your cart. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleClearCart}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear Cart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}
