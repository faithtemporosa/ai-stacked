import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FuturisticBackground } from "@/components/FuturisticBackground";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Bot, Cog, Zap, Clock } from "lucide-react";

const AutomationsSupport = () => {

  return (
    <div className="min-h-screen relative">
      <FuturisticBackground />
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 tech-grid relative overflow-hidden">
        <div className="absolute top-20 left-10 w-56 h-56 border-2 border-primary/20 rounded-lg animate-float pointer-events-none" />
        <div className="container mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block px-4 py-1 rounded-full border border-accent/20 bg-accent/5 text-sm font-medium text-accent mb-6">
              Automation & Support
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 gradient-text">
              Scale with AI-Powered Automation
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Free up your time and maximize efficiency with intelligent automation systems.
            </p>
            <Link to="/get-started">
              <Button size="lg" className="gradient-primary shadow-glow text-lg">
                Automate Your Growth
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Automation Features */}
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Automation Solutions</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="p-8 glass tech-border-animate">
              <Bot className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">AI Outreach</h3>
              <p className="text-muted-foreground">
                Automated creator outreach with personalized messaging at scale.
              </p>
            </Card>
            <Card className="p-8 glass tech-border-animate">
              <Cog className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">Workflow Automation</h3>
              <p className="text-muted-foreground">
                Streamline campaign management with automated workflows and approvals.
              </p>
            </Card>
            <Card className="p-8 glass tech-border-animate">
              <Zap className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">Smart Analytics</h3>
              <p className="text-muted-foreground">
                Automated reporting and insights delivered to your dashboard.
              </p>
            </Card>
            <Card className="p-8 glass tech-border-animate">
              <Clock className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">24/7 Support</h3>
              <p className="text-muted-foreground">
                Round-the-clock AI assistance for your campaigns and partnerships.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* What We Automate */}
      <section className="py-20 px-4 tech-grid">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">What We Automate</h2>
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
            <Card className="p-6 glass shadow-neon">
              <h3 className="text-xl font-semibold mb-3">Creator Discovery</h3>
              <p className="text-muted-foreground">
                AI-powered matching algorithms find the perfect creators for your brand based on audience demographics, engagement rates, and content alignment.
              </p>
            </Card>
            <Card className="p-6 glass shadow-neon">
              <h3 className="text-xl font-semibold mb-3">Campaign Management</h3>
              <p className="text-muted-foreground">
                Automated campaign scheduling, content approval workflows, and performance tracking to keep everything running smoothly.
              </p>
            </Card>
            <Card className="p-6 glass shadow-neon">
              <h3 className="text-xl font-semibold mb-3">Performance Monitoring</h3>
              <p className="text-muted-foreground">
                Real-time analytics tracking with automated alerts for key metrics, anomalies, and optimization opportunities.
              </p>
            </Card>
            <Card className="p-6 glass shadow-neon">
              <h3 className="text-xl font-semibold mb-3">Payment Processing</h3>
              <p className="text-muted-foreground">
                Automated invoicing, payment scheduling, and commission calculations for all your creator partnerships.
              </p>
            </Card>
            <Card className="p-6 glass shadow-neon">
              <h3 className="text-xl font-semibold mb-3">Content Compliance</h3>
              <p className="text-muted-foreground">
                AI-powered content review ensures brand safety and compliance with platform guidelines before publishing.
              </p>
            </Card>
            <Card className="p-6 glass shadow-neon">
              <h3 className="text-xl font-semibold mb-3">Reporting & Insights</h3>
              <p className="text-muted-foreground">
                Automated report generation with actionable insights and recommendations delivered on your schedule.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-8">Dedicated Support</h2>
            <p className="text-xl text-center text-muted-foreground mb-12">
              Beyond automation, our expert team is always ready to help
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="p-6 glass text-center">
                <h3 className="text-2xl font-bold text-primary mb-2">Instant</h3>
                <p className="text-muted-foreground">Response time via chat</p>
              </Card>
              <Card className="p-6 glass text-center">
                <h3 className="text-2xl font-bold text-primary mb-2">Expert</h3>
                <p className="text-muted-foreground">Dedicated account managers</p>
              </Card>
              <Card className="p-6 glass text-center">
                <h3 className="text-2xl font-bold text-primary mb-2">Proactive</h3>
                <p className="text-muted-foreground">Campaign optimization suggestions</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 tech-grid">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Automate Your Growth?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Let AI handle the routine tasks while you focus on strategy and growth.
          </p>
          <Link to="/get-started">
            <Button size="lg" className="gradient-primary shadow-glow text-lg">
              Get Started
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AutomationsSupport;
