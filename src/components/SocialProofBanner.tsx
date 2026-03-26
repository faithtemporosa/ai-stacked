import { useState, useEffect } from "react";
import { Users, Clock, TrendingUp, Shield, Star, CheckCircle2 } from "lucide-react";

const liveActivities = [
  "John D. from Austin just started an automation",
  "Sarah M. from NYC saved 85 hours this month",
  "Mike R. from LA added Email Marketing to cart",
  "Emma K. from Chicago deployed 3 automations",
  "David L. from Seattle automated his invoicing",
  "Lisa P. from Miami saved $4,200 this month",
  "Alex T. from Denver started Discord Bot setup",
  "Rachel B. from Boston automated lead capture",
];

export const SocialProofBanner = () => {
  const [currentActivity, setCurrentActivity] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [activeUsers, setActiveUsers] = useState(47);

  useEffect(() => {
    const activityInterval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentActivity((prev) => (prev + 1) % liveActivities.length);
        setIsVisible(true);
      }, 300);
    }, 4000);

    // Simulate fluctuating active users
    const usersInterval = setInterval(() => {
      setActiveUsers((prev) => prev + Math.floor(Math.random() * 5) - 2);
    }, 8000);

    return () => {
      clearInterval(activityInterval);
      clearInterval(usersInterval);
    };
  }, []);

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm animate-fade-in hidden sm:block">
      <div 
        className={`
          bg-card/95 backdrop-blur-lg border border-border rounded-xl p-4 shadow-lg
          transition-all duration-300 transform
          ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
        `}
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-full">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {liveActivities[currentActivity]}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Just now
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs text-muted-foreground">
              {activeUsers} people browsing now
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TrustBadges = () => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 py-6">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Shield className="w-5 h-5 text-primary" />
        <span className="text-sm font-medium">256-bit SSL</span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <CheckCircle2 className="w-5 h-5 text-primary" />
        <span className="text-sm font-medium">30-Day Guarantee</span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Star className="w-5 h-5 text-primary" />
        <span className="text-sm font-medium">4.9/5 Rating</span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Users className="w-5 h-5 text-primary" />
        <span className="text-sm font-medium">500+ Clients</span>
      </div>
    </div>
  );
};

export const UrgencyBanner = () => {
  const [spotsLeft, setSpotsLeft] = useState(7);

  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-center">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Clock className="w-5 h-5 text-destructive" />
        <span className="font-bold text-destructive">Limited Availability</span>
      </div>
      <p className="text-sm text-foreground">
        Only <span className="font-bold text-destructive">{spotsLeft} spots</span> left for this month's deployment queue
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        New slots open on the 1st of next month
      </p>
    </div>
  );
};

export const TestimonialStrip = () => {
  const testimonials = [
    {
      quote: "Saved me 80+ hours in the first month alone",
      author: "Sarah M.",
      role: "E-commerce Founder",
      avatar: "S",
    },
    {
      quote: "Best investment I've made for my business",
      author: "Mike R.",
      role: "Marketing Agency Owner",
      avatar: "M",
    },
    {
      quote: "Setup was seamless, ROI was immediate",
      author: "Emily K.",
      role: "SaaS Startup CEO",
      avatar: "E",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {testimonials.map((testimonial, index) => (
        <div
          key={index}
          className="bg-card/50 backdrop-blur border border-border/50 rounded-xl p-6 text-center"
        >
          <div className="flex justify-center mb-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            ))}
          </div>
          <p className="text-foreground italic mb-4">"{testimonial.quote}"</p>
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {testimonial.avatar}
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">{testimonial.author}</p>
              <p className="text-xs text-muted-foreground">{testimonial.role}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const MoneyBackGuarantee = () => {
  return (
    <div className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border border-primary/20 rounded-2xl p-6 sm:p-8 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
        <Shield className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">
        30-Day Money Back Guarantee
      </h3>
      <p className="text-muted-foreground max-w-md mx-auto">
        Not satisfied? Get a full refund within 30 days, no questions asked. 
        We're confident you'll love the results.
      </p>
    </div>
  );
};
