import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FuturisticBackground } from "@/components/FuturisticBackground";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { TrendingUp, Target, BarChart, Lightbulb } from "lucide-react";

const GrowthStrategy = () => {

  return (
    <div className="min-h-screen relative">
      <FuturisticBackground />
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 tech-grid relative overflow-hidden">
        <div className="absolute bottom-20 right-10 w-64 h-64 border-2 border-accent/20 rounded-full animate-pulse-glow pointer-events-none" />
        <div className="container mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block px-4 py-1 rounded-full border border-accent/20 bg-accent/5 text-sm font-medium text-accent mb-6">
              Growth Strategy
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 gradient-text">
              Strategic Growth Planning
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Data-driven strategies designed to accelerate your brand's growth through creator partnerships.
            </p>
            <Link to="/get-started">
              <Button size="lg" className="gradient-primary shadow-glow text-lg">
                Plan Your Growth
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Strategy Pillars */}
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Growth Strategy Pillars</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="p-8 glass tech-border-animate">
              <TrendingUp className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">Market Analysis</h3>
              <p className="text-muted-foreground">
                Deep market research and competitive analysis to identify growth opportunities.
              </p>
            </Card>
            <Card className="p-8 glass tech-border-animate">
              <Target className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">Audience Targeting</h3>
              <p className="text-muted-foreground">
                Precise audience segmentation and targeting strategies for maximum impact.
              </p>
            </Card>
            <Card className="p-8 glass tech-border-animate">
              <BarChart className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">Performance Metrics</h3>
              <p className="text-muted-foreground">
                KPI tracking and optimization to ensure continuous growth and improvement.
              </p>
            </Card>
            <Card className="p-8 glass tech-border-animate">
              <Lightbulb className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">Innovation</h3>
              <p className="text-muted-foreground">
                Cutting-edge strategies that keep your brand ahead of the competition.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Strategy Process */}
      <section className="py-20 px-4 tech-grid">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Our Strategic Approach</h2>
          <div className="max-w-5xl mx-auto space-y-6">
            <Card className="p-8 glass shadow-neon">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl">
                    01
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-3">Discovery & Assessment</h3>
                  <p className="text-muted-foreground mb-4">
                    We start by understanding your brand, current position, and growth goals through comprehensive analysis.
                  </p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Brand audit and positioning analysis</li>
                    <li>• Current performance evaluation</li>
                    <li>• Competitor landscape review</li>
                    <li>• Growth opportunity identification</li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="p-8 glass shadow-neon">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl">
                    02
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-3">Strategy Development</h3>
                  <p className="text-muted-foreground mb-4">
                    Create a customized growth roadmap tailored to your specific goals and market conditions.
                  </p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Goal setting and milestone planning</li>
                    <li>• Creator partnership strategy</li>
                    <li>• Content and campaign planning</li>
                    <li>• Budget allocation and ROI projections</li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="p-8 glass shadow-neon">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl">
                    03
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-3">Execution & Optimization</h3>
                  <p className="text-muted-foreground mb-4">
                    Implement strategies with continuous monitoring and optimization for maximum results.
                  </p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Campaign launch and management</li>
                    <li>• Real-time performance tracking</li>
                    <li>• A/B testing and iteration</li>
                    <li>• Continuous optimization cycles</li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="p-8 glass shadow-neon">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl">
                    04
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-3">Scale & Expand</h3>
                  <p className="text-muted-foreground mb-4">
                    Scale successful strategies and explore new growth channels as your brand evolves.
                  </p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Performance analysis and reporting</li>
                    <li>• Strategy refinement and scaling</li>
                    <li>• New market and channel expansion</li>
                    <li>• Long-term growth planning</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Expected Outcomes</h2>
          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
            <Card className="p-8 glass text-center">
              <div className="text-5xl font-bold text-primary mb-3">3x</div>
              <h3 className="text-xl font-semibold mb-2">ROI Growth</h3>
              <p className="text-muted-foreground">
                Average return on investment increase within 6 months
              </p>
            </Card>
            <Card className="p-8 glass text-center">
              <div className="text-5xl font-bold text-primary mb-3">5x</div>
              <h3 className="text-xl font-semibold mb-2">Reach Expansion</h3>
              <p className="text-muted-foreground">
                Audience reach multiplier through strategic partnerships
              </p>
            </Card>
            <Card className="p-8 glass text-center">
              <div className="text-5xl font-bold text-primary mb-3">10x</div>
              <h3 className="text-xl font-semibold mb-2">Engagement Boost</h3>
              <p className="text-muted-foreground">
                Enhanced engagement rates with targeted strategies
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 tech-grid">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Accelerate Your Growth?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Let's create a custom growth strategy that takes your brand to the next level.
          </p>
          <Link to="/get-started">
            <Button size="lg" className="gradient-primary shadow-glow text-lg">
              Start Growing Today
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default GrowthStrategy;
