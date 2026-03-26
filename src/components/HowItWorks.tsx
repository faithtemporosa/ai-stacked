import { Card } from "@/components/ui/card";
import { Search, Handshake, Rocket, LineChart } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Discovery",
    description: "We analyze your brand, target audience, and goals to create a custom growth strategy.",
  },
  {
    icon: Handshake,
    title: "Creator Matching",
    description: "We connect you with the perfect creators who align with your brand values and audience.",
  },
  {
    icon: Rocket,
    title: "Campaign Launch",
    description: "We execute organic campaigns across social platforms with authentic creator content.",
  },
  {
    icon: LineChart,
    title: "Growth & Optimization",
    description: "We track performance, provide insights, and continuously optimize for better results.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 bg-secondary/30 tech-grid relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-20 right-10 w-40 h-40 border border-primary/20 rounded-full animate-pulse-glow" />
      <div className="absolute bottom-20 left-10 w-32 h-32 border border-accent/20 rotate-45 animate-float" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-1 rounded-full border border-accent/20 bg-accent/5 text-sm font-medium text-accent mb-4">
            Our Process
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            From Zero to <span className="gradient-primary bg-clip-text text-transparent">Hero</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A systematic, data-driven approach to exponential brand growth.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <Card className="p-6 h-full glass hover:shadow-neon transition-smooth group tech-border-animate">
                {/* Step number badge */}
                <div className="flex items-center justify-center w-12 h-12 rounded-full gradient-primary text-white font-bold text-lg mb-4 shadow-neon group-hover:scale-110 transition-transform">
                  {index + 1}
                </div>
                
                {/* Icon */}
                <div className="w-14 h-14 rounded-xl bg-secondary/50 flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-smooth">
                  <step.icon className="text-primary" size={28} />
                </div>
                
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </Card>
              
              {/* Connecting line with glow effect */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/3 -right-3 w-6 h-0.5 z-10">
                  <div className="h-full gradient-primary rounded-full shadow-neon" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
