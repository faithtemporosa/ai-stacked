import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FuturisticBackground } from "@/components/FuturisticBackground";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Users, TrendingUp, Target, Zap } from "lucide-react";

const CreatorPartnerships = () => {

  return (
    <div className="min-h-screen relative">
      <FuturisticBackground />
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 tech-grid relative overflow-hidden">
        <div className="absolute top-20 right-10 w-64 h-64 border-2 border-primary/20 rounded-full animate-pulse-glow pointer-events-none" />
        <div className="container mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block px-4 py-1 rounded-full border border-accent/20 bg-accent/5 text-sm font-medium text-accent mb-6">
              Creator Partnerships
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 gradient-text">
              Partner with Top Creators
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Connect your brand with authentic creators who align with your values and drive real engagement.
            </p>
            <Link to="/get-started">
              <Button size="lg" className="gradient-primary shadow-glow text-lg">
                Start Partnering
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Why Creator Partnerships Work</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="p-8 glass tech-border-animate">
              <Users className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">Authentic Connection</h3>
              <p className="text-muted-foreground">
                Creators build genuine relationships with their audiences, resulting in higher trust and conversion rates.
              </p>
            </Card>
            <Card className="p-8 glass tech-border-animate">
              <TrendingUp className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">Proven ROI</h3>
              <p className="text-muted-foreground">
                Track measurable results with our analytics dashboard and optimize campaigns in real-time.
              </p>
            </Card>
            <Card className="p-8 glass tech-border-animate">
              <Target className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">Targeted Reach</h3>
              <p className="text-muted-foreground">
                Access niche audiences that align perfectly with your brand's target demographic.
              </p>
            </Card>
            <Card className="p-8 glass tech-border-animate">
              <Zap className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">Rapid Scaling</h3>
              <p className="text-muted-foreground">
                Quickly expand your reach by partnering with multiple creators simultaneously.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 px-4 tech-grid relative">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Our Partnership Process</h2>
          <div className="max-w-4xl mx-auto space-y-8">
            <Card className="p-8 glass shadow-neon">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-2">Discovery & Matching</h3>
                  <p className="text-muted-foreground">
                    We analyze your brand and target audience to identify the perfect creator partners who align with your values and goals.
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-8 glass shadow-neon">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-2">Campaign Strategy</h3>
                  <p className="text-muted-foreground">
                    Collaborate with creators to develop authentic content strategies that resonate with their audience while meeting your objectives.
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-8 glass shadow-neon">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-2">Launch & Optimize</h3>
                  <p className="text-muted-foreground">
                    Execute campaigns with real-time monitoring and optimization to maximize engagement and conversions.
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-8 glass shadow-neon">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl flex-shrink-0">
                  4
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-2">Results & Reporting</h3>
                  <p className="text-muted-foreground">
                    Receive detailed analytics and insights on campaign performance, ROI, and audience engagement metrics.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Partner with Creators?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start building authentic connections with creators who can amplify your brand message.
          </p>
          <Link to="/get-started">
            <Button size="lg" className="gradient-primary shadow-glow text-lg">
              Get Started Today
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CreatorPartnerships;
