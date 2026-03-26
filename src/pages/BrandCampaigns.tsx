import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FuturisticBackground } from "@/components/FuturisticBackground";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Rocket, LineChart, Megaphone, CheckCircle, Target } from "lucide-react";

const BrandCampaigns = () => {

  return (
    <div className="min-h-screen relative">
      <FuturisticBackground />
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 tech-grid relative overflow-hidden">
        <div className="absolute bottom-10 left-10 w-48 h-48 border-2 border-accent/20 rounded-lg rotate-12 animate-float pointer-events-none" />
        <div className="container mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block px-4 py-1 rounded-full border border-accent/20 bg-accent/5 text-sm font-medium text-accent mb-6">
              Brand Campaigns
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 gradient-text">
              Launch Campaigns That Convert
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Data-driven campaigns designed to maximize reach, engagement, and ROI for your brand.
            </p>
            <Link to="/get-started">
              <Button size="lg" className="gradient-primary shadow-glow text-lg">
                Launch Your Campaign
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Campaign Types */}
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Campaign Solutions</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="p-8 glass tech-border-animate">
              <Rocket className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-2xl font-semibold mb-3">Product Launches</h3>
              <p className="text-muted-foreground mb-4">
                Create buzz and drive early adoption with strategic launch campaigns that leverage creator networks and viral content.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Pre-launch hype building</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Coordinated multi-creator reveals</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Launch day amplification</span>
                </li>
              </ul>
            </Card>
            <Card className="p-8 glass tech-border-animate">
              <LineChart className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-2xl font-semibold mb-3">Performance Campaigns</h3>
              <p className="text-muted-foreground mb-4">
                Maximize conversions with performance-focused campaigns optimized for measurable business outcomes.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Conversion-optimized content</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>A/B testing and iteration</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Real-time performance tracking</span>
                </li>
              </ul>
            </Card>
            <Card className="p-8 glass tech-border-animate">
              <Megaphone className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-2xl font-semibold mb-3">Brand Awareness</h3>
              <p className="text-muted-foreground mb-4">
                Build lasting brand recognition through strategic storytelling and consistent messaging across channels.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Multi-platform brand presence</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Consistent brand narrative</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Audience sentiment analysis</span>
                </li>
              </ul>
            </Card>
            <Card className="p-8 glass tech-border-animate">
              <Target className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-2xl font-semibold mb-3">Seasonal Campaigns</h3>
              <p className="text-muted-foreground mb-4">
                Capitalize on key moments and seasonal trends with timely campaigns that drive urgency and action.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Holiday and event marketing</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Trend-jacking strategies</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Limited-time promotions</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 tech-grid">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Campaign Features</h2>
          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
            <Card className="p-6 glass shadow-neon text-center">
              <div className="text-4xl font-bold text-primary mb-2">360°</div>
              <h3 className="text-lg font-semibold mb-2">Full Coverage</h3>
              <p className="text-sm text-muted-foreground">
                Multi-channel campaigns across all major platforms
              </p>
            </Card>
            <Card className="p-6 glass shadow-neon text-center">
              <div className="text-4xl font-bold text-primary mb-2">24/7</div>
              <h3 className="text-lg font-semibold mb-2">Monitoring</h3>
              <p className="text-sm text-muted-foreground">
                Real-time campaign tracking and optimization
              </p>
            </Card>
            <Card className="p-6 glass shadow-neon text-center">
              <div className="text-4xl font-bold text-primary mb-2">∞</div>
              <h3 className="text-lg font-semibold mb-2">Scalability</h3>
              <p className="text-sm text-muted-foreground">
                Scale campaigns seamlessly as your brand grows
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Launch Your Campaign?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Let's create a campaign that drives real results for your brand.
          </p>
          <Link to="/get-started">
            <Button size="lg" className="gradient-primary shadow-glow text-lg">
              Start Your Campaign
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default BrandCampaigns;
