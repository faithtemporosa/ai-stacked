import { Card } from "@/components/ui/card";
import { Heart, Zap, Users } from "lucide-react";

const About = () => {
  return (
    <section id="about" className="py-12 sm:py-16 md:py-20 bg-secondary">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              About Bump Syndicate
            </h2>
            <p className="text-base sm:text-xl text-muted-foreground px-4">
              We're on a mission to revolutionize how brands grow in the creator economy.
            </p>
          </div>

          <Card className="p-6 sm:p-8 md:p-12 mb-8 sm:mb-12">
            <p className="text-base sm:text-lg text-foreground mb-4 sm:mb-6">
              Founded by creators and brand strategists, Bump Syndicate bridges the gap between ambitious brands and authentic creators. We believe in the power of genuine partnerships over paid advertisements.
            </p>
            <p className="text-base sm:text-lg text-foreground mb-4 sm:mb-6">
              Our approach is simple: connect brands with creators who genuinely believe in their products. The result? Organic growth, engaged communities, and sustainable brand loyalty that goes beyond vanity metrics.
            </p>
            <p className="text-base sm:text-lg text-foreground">
              With our platform <span className="font-semibold text-primary">Kollabsy</span>, we've facilitated thousands of successful brand-creator partnerships, helping businesses of all sizes amplify their message and reach their ideal customers.
            </p>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            <Card className="p-6 text-center hover:shadow-glow transition-smooth">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Heart className="text-primary" size={32} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Authentic</h3>
              <p className="text-muted-foreground">
                We prioritize genuine connections over transactional relationships.
              </p>
            </Card>

            <Card className="p-6 text-center hover:shadow-glow transition-smooth">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="text-accent" size={32} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Results-Driven</h3>
              <p className="text-muted-foreground">
                We focus on metrics that matter: engagement, conversions, and growth.
              </p>
            </Card>

            <Card className="p-6 text-center hover:shadow-glow transition-smooth">
              <div className="w-16 h-16 rounded-full bg-primary-glow/10 flex items-center justify-center mx-auto mb-4">
                <Users className="text-primary-glow" size={32} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Community-First</h3>
              <p className="text-muted-foreground">
                We help you build lasting relationships with your audience.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
