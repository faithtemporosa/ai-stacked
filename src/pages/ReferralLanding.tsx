import { useSearchParams, Link } from "react-router-dom";
import { Gift, CheckCircle, Users, Percent, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ReferralLanding() {
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref');

  const benefits = [
    {
      icon: Percent,
      title: "10% Off Your First Purchase",
      description: "Get an exclusive discount on your first automation purchase when you sign up through this referral link."
    },
    {
      icon: Sparkles,
      title: "Premium Automations",
      description: "Access our full catalog of time-saving business automations built by expert engineers."
    },
    {
      icon: Users,
      title: "Join Our Community",
      description: "Become part of a growing community of businesses automating their workflows."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-28 pb-16">
        <div className="container max-w-4xl mx-auto px-4">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Gift className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary">You've been referred!</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Welcome to <span className="text-primary">AI-Stacked</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              You've received a special invitation to join our automation platform. 
              Sign up now and get <strong className="text-foreground">10% off</strong> your first purchase!
            </p>

            {referralCode && (
              <Card className="inline-flex items-center gap-3 px-6 py-4 bg-primary/5 border-primary/20">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm">
                  Referral code <strong className="text-primary">{referralCode}</strong> will be automatically applied
                </span>
              </Card>
            )}
          </div>

          {/* Benefits Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {benefits.map((benefit, index) => (
              <Card key={index} className="p-6 text-center hover:border-primary/30 transition-colors">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </Card>
            ))}
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <Card className="p-8 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-muted-foreground mb-6">
                Create your free account now and claim your 10% discount on your first automation purchase.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="gap-2">
                  <Link to={`/auth?ref=${referralCode || ''}`}>
                    Claim Your Discount
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/catalog">
                    Browse Automations First
                  </Link>
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground mt-4">
                No credit card required. Your discount will be applied at checkout.
              </p>
            </Card>
          </div>

          {/* How It Works */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 font-bold">
                  1
                </div>
                <h3 className="font-semibold mb-2">Sign Up</h3>
                <p className="text-sm text-muted-foreground">
                  Create your free account using the referral link
                </p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 font-bold">
                  2
                </div>
                <h3 className="font-semibold mb-2">Choose Automations</h3>
                <p className="text-sm text-muted-foreground">
                  Browse and select the automations that fit your needs
                </p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 font-bold">
                  3
                </div>
                <h3 className="font-semibold mb-2">Save 10%</h3>
                <p className="text-sm text-muted-foreground">
                  Your discount is automatically applied at checkout
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
