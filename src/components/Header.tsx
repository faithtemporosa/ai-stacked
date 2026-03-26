// @ts-nocheck
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, X, ShoppingCart, Heart, LogIn, LogOut, User, Settings, Shield, Package, ClipboardList, HandCoins } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAdmin } from "@/hooks/use-admin";
import { MiniCartPanel } from "@/components/MiniCartPanel";
import { NotificationCenter } from "@/components/NotificationCenter";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import robotMascot from "@/assets/robot-mascot.svg";
import aiLogo from "@/assets/ai-brand-logo.png";
const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [badgeAnimate, setBadgeAnimate] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [hasSubscription, setHasSubscription] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const {
    itemCount
  } = useCart();
  const {
    user,
    signOut
  } = useAuth();
  const {
    wishlistIds
  } = useWishlist();
  const {
    isAdmin
  } = useAdmin();

  // Check if user has any active subscriptions
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        setHasSubscription(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1);
      
      if (!error && data && data.length > 0) {
        setHasSubscription(true);
      } else {
        setHasSubscription(false);
      }
    };
    
    checkSubscription();
  }, [user]);
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 20);

      // Hide header when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener("scroll", handleScroll, {
      passive: true
    });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);
  useEffect(() => {
    if (itemCount > 0) {
      setBadgeAnimate(true);
      const timer = setTimeout(() => setBadgeAnimate(false), 600);
      return () => clearTimeout(timer);
    }
  }, [itemCount]);
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth"
      });
      setIsMobileMenuOpen(false);
    }
  };
  return <>
      <MiniCartPanel />
      <header className={`fixed top-9 left-0 right-0 z-50 transition-all duration-500 ${isVisible ? 'translate-y-0' : '-translate-y-full'} ${isScrolled ? "bg-black border-b border-white/10 shadow-neon backdrop-blur-xl" : "bg-black/95 backdrop-blur-sm"} text-white`}>
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <Link to="/" onClick={() => window.scrollTo(0, 0)} className="flex items-center gap-2 sm:gap-3 group">
            <img src={aiLogo} alt="AI" className="h-8 sm:h-10 md:h-12 w-auto group-hover:scale-105 transition-transform duration-300" />
          </Link>

          {/* Desktop Navigation */}
          <TooltipProvider>
          <nav className="hidden lg:flex items-center gap-3 xl:gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/catalog" onClick={() => window.scrollTo(0, 0)} className="text-sm xl:text-base text-white hover:text-primary transition-all duration-300 hover:scale-105 hover:drop-shadow-glow relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-primary after:to-accent after:transition-all after:duration-300 hover:after:w-full whitespace-nowrap">
                  Automations
                </Link>
              </TooltipTrigger>
              <TooltipContent>Browse Automations</TooltipContent>
            </Tooltip>
            {hasSubscription && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/onboarding" onClick={() => window.scrollTo(0, 0)} className="text-sm xl:text-base text-white hover:text-primary transition-all duration-300 hover:scale-105 relative inline-flex items-center gap-1.5 group whitespace-nowrap">
                    <ClipboardList className="w-4 h-4 group-hover:drop-shadow-glow transition-all duration-300" />
                    <span className="relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-primary after:to-accent after:transition-all after:duration-300 group-hover:after:w-full hidden xl:inline">Onboarding</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Onboarding</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/wishlist" onClick={() => window.scrollTo(0, 0)} className="text-sm xl:text-base text-white hover:text-primary transition-all duration-300 hover:scale-105 relative inline-flex items-center gap-1.5 group whitespace-nowrap">
                  <Heart className="w-4 h-4 group-hover:fill-primary transition-all duration-300" />
                  <span className="relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-primary after:to-accent after:transition-all after:duration-300 group-hover:after:w-full hidden xl:inline">Wishlist</span>
                  {wishlistIds.size > 0 && <Badge variant="secondary" className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center p-0 text-xs animate-pulse">
                      {wishlistIds.size}
                    </Badge>}
                </Link>
              </TooltipTrigger>
              <TooltipContent>Wishlist</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/cart" onClick={() => window.scrollTo(0, 0)} className="text-sm xl:text-base text-white hover:text-primary transition-all duration-300 hover:scale-105 relative inline-flex items-center gap-1.5 group whitespace-nowrap">
                  <ShoppingCart className="w-4 h-4 group-hover:drop-shadow-glow transition-all duration-300" />
                  <span className="relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-primary after:to-accent after:transition-all after:duration-300 group-hover:after:w-full hidden xl:inline">Cart</span>
                  {itemCount > 0 && <Badge variant="destructive" className={`absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center p-0 text-xs ${badgeAnimate ? 'animate-bounce' : 'animate-pulse'}`}>
                      {itemCount}
                    </Badge>}
                </Link>
              </TooltipTrigger>
              <TooltipContent>Cart</TooltipContent>
            </Tooltip>
            {hasSubscription && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/my-orders" onClick={() => window.scrollTo(0, 0)} className="text-sm xl:text-base text-white hover:text-primary transition-all duration-300 hover:scale-105 relative inline-flex items-center gap-1.5 group whitespace-nowrap">
                    <Package className="w-4 h-4 group-hover:drop-shadow-glow transition-all duration-300" />
                    <span className="relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-primary after:to-accent after:transition-all after:duration-300 group-hover:after:w-full hidden xl:inline">Orders</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>My Orders</TooltipContent>
              </Tooltip>
            )}
            {user && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/affiliate" onClick={() => window.scrollTo(0, 0)} className="text-sm xl:text-base text-white hover:text-primary transition-all duration-300 hover:scale-105 relative inline-flex items-center gap-1.5 group whitespace-nowrap">
                    <HandCoins className="w-4 h-4 group-hover:drop-shadow-glow transition-all duration-300" />
                    <span className="relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-primary after:to-accent after:transition-all after:duration-300 group-hover:after:w-full hidden xl:inline">Affiliate</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Affiliate Program</TooltipContent>
              </Tooltip>
            )}
            {user && <NotificationCenter />}
            {user ? <>
                {isAdmin && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link to="/admin" onClick={() => window.scrollTo(0, 0)}>
                        <Button variant="ghost" size="sm" className="gap-1 xl:gap-2">
                          <Shield className="w-4 h-4" />
                          <span className="hidden xl:inline">Admin</span>
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>Admin Dashboard</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link to="/settings" onClick={() => window.scrollTo(0, 0)}>
                      <Button variant="ghost" size="sm" className="gap-1 xl:gap-2">
                        <Settings className="w-4 h-4" />
                        <span className="hidden xl:inline">Settings</span>
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>Settings</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={() => signOut()} className="gap-1 xl:gap-2">
                      <LogOut className="w-4 h-4" />
                      <span className="hidden xl:inline">Sign Out</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sign Out</TooltipContent>
                </Tooltip>
              </> : (
                <Link to="/auth" onClick={() => window.scrollTo(0, 0)}>
                  <Button variant="default" size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-white font-medium px-4">
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </Button>
                </Link>
              )}
          </nav>
          </TooltipProvider>

          {/* Mobile Menu Button */}
          <button className="lg:hidden text-white p-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && <nav className="lg:hidden mt-4 pb-4 flex flex-col gap-4 animate-fade-in border-t border-cyan-500/20 pt-4 relative overflow-hidden rounded-lg px-4 shadow-2xl">
            {/* Hexagonal pattern background */}
            <div className="absolute inset-0 bg-[#0a1628] opacity-95" 
                 style={{
                   backgroundImage: `
                     linear-gradient(30deg, transparent 48%, rgba(30, 58, 138, 0.2) 49%, rgba(30, 58, 138, 0.2) 51%, transparent 52%),
                     linear-gradient(90deg, transparent 48%, rgba(30, 58, 138, 0.2) 49%, rgba(30, 58, 138, 0.2) 51%, transparent 52%),
                     linear-gradient(150deg, transparent 48%, rgba(30, 58, 138, 0.2) 49%, rgba(30, 58, 138, 0.2) 51%, transparent 52%)
                   `,
                   backgroundSize: '20px 35px',
                   backgroundPosition: '0 0, 10px 17.5px, 10px 17.5px'
                 }}
            />
            <div className="absolute inset-0 backdrop-blur-md" />
            <div className="relative z-10">
            <Link to="/catalog" className="text-white hover:text-primary transition-smooth text-left" onClick={() => {
            setIsMobileMenuOpen(false);
            window.scrollTo(0, 0);
          }}>
              Automations
            </Link>
            {hasSubscription && (
              <Link to="/onboarding" className="text-white hover:text-primary transition-smooth text-left flex items-center gap-2" onClick={() => {
                setIsMobileMenuOpen(false);
                window.scrollTo(0, 0);
              }}>
                <ClipboardList className="w-5 h-5" />
                Onboarding
              </Link>
            )}
            <Link to="/wishlist" className="text-white hover:text-primary transition-smooth text-left flex items-center gap-2" onClick={() => {
            setIsMobileMenuOpen(false);
            window.scrollTo(0, 0);
          }}>
              <Heart className="w-5 h-5" />
              Wishlist
              {wishlistIds.size > 0 && <Badge variant="secondary" className="h-5 min-w-5 flex items-center justify-center p-0 text-xs ml-auto">
                  {wishlistIds.size}
                </Badge>}
            </Link>
            <Link to="/cart" className="text-white hover:text-primary transition-smooth text-left flex items-center gap-2" onClick={() => {
            setIsMobileMenuOpen(false);
            window.scrollTo(0, 0);
          }}>
              <ShoppingCart className="w-5 h-5" />
              Cart
              {itemCount > 0 && <Badge variant="destructive" className={`h-5 min-w-5 flex items-center justify-center p-0 text-xs ml-auto ${badgeAnimate ? 'animate-bounce' : ''}`}>
                  {itemCount}
                </Badge>}
            </Link>
            {hasSubscription && (
              <Link to="/my-orders" className="text-white hover:text-primary transition-smooth text-left flex items-center gap-2" onClick={() => {
                setIsMobileMenuOpen(false);
                window.scrollTo(0, 0);
              }}>
                <Package className="w-5 h-5" />
                My Orders
              </Link>
            )}
            {user && (
              <Link to="/affiliate" className="text-white hover:text-primary transition-smooth text-left flex items-center gap-2" onClick={() => {
                setIsMobileMenuOpen(false);
                window.scrollTo(0, 0);
              }}>
                <HandCoins className="w-5 h-5" />
                Affiliate
              </Link>
            )}
            {user ? <>
                {isAdmin && <Link to="/admin" onClick={() => {
              setIsMobileMenuOpen(false);
              window.scrollTo(0, 0);
            }}>
                    <Button variant="ghost" size="sm" className="gap-2 w-full justify-start">
                      <Shield className="w-4 h-4" />
                      Admin
                    </Button>
                  </Link>}
                <Link to="/settings" onClick={() => {
              setIsMobileMenuOpen(false);
              window.scrollTo(0, 0);
            }}>
                  <Button variant="ghost" size="sm" className="gap-2 w-full justify-start">
                    <Settings className="w-4 h-4" />
                    Settings
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => {
              signOut();
              setIsMobileMenuOpen(false);
            }} className="gap-2 justify-start">
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </> : <Link to="/auth" onClick={() => {
            setIsMobileMenuOpen(false);
            window.scrollTo(0, 0);
          }}>
                <Button variant="ghost" size="sm" className="gap-2 w-full justify-start">
                  <LogIn className="w-4 h-4" />
                  Sign In
                 </Button>
               </Link>}
           </div>
          </nav>}
        </div>
      </header>
    </>;
};
export default Header;