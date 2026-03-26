import { Link } from "react-router-dom";
import { DollarSign, Users, Percent, Sparkles, Zap, Clock, ArrowRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export const AffiliateMarquee = () => {
  const { user } = useAuth();

  // Content for authenticated users (affiliate promotion)
  const affiliateContent = (
    <>
      <span className="inline-flex items-center gap-2 mx-8">
        <DollarSign className="h-4 w-4 text-primary" />
        <span>Earn 25% recurring commission</span>
      </span>
      <span className="inline-flex items-center gap-2 mx-8">
        <Users className="h-4 w-4 text-primary" />
        <span>Join our Affiliate Program</span>
      </span>
      <span className="inline-flex items-center gap-2 mx-8">
        <Percent className="h-4 w-4 text-primary" />
        <span>Your referrals get 10% off</span>
      </span>
      <span className="inline-flex items-center gap-2 mx-8">
        <DollarSign className="h-4 w-4 text-primary" />
        <span>Automatic payouts every 60 days</span>
      </span>
    </>
  );

  // Content for non-authenticated users (signup promotion)
  const signupContent = (
    <>
      <span className="inline-flex items-center gap-2 mx-8">
        <Sparkles className="h-4 w-4 text-yellow-400" />
        <span>1,200+ AI Automations Available</span>
      </span>
      <span className="inline-flex items-center gap-2 mx-8">
        <Clock className="h-4 w-4 text-green-400" />
        <span>Save 100+ Hours Every Month</span>
      </span>
      <span className="inline-flex items-center gap-2 mx-8">
        <Zap className="h-4 w-4 text-blue-400" />
        <span>Starting at $99/month</span>
      </span>
      <span className="inline-flex items-center gap-2 mx-8">
        <ArrowRight className="h-4 w-4 text-primary" />
        <span>Sign Up Free to Get Started</span>
      </span>
    </>
  );

  const content = user ? affiliateContent : signupContent;
  const linkTo = user ? "/affiliate" : "/auth";

  return (
    <Link 
      to={linkTo} 
      className="fixed top-0 left-0 right-0 z-[60] bg-slate-900 border-b border-primary/20 py-2 overflow-hidden hover:bg-slate-800 transition-colors"
    >
      <div className="animate-marquee whitespace-nowrap flex items-center text-sm font-medium text-white">
        {content}
        {content}
        {content}
        {content}
      </div>
    </Link>
  );
};

export const MARQUEE_HEIGHT = 36; // px - used to offset other fixed elements
