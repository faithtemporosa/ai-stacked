import { Card } from "@/components/ui/card";
import { Users, BarChart3, TrendingUp, Shield } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Creator Partnerships",
    description: "Connect with authentic creators who align with your brand values and target audience.",
  },
  {
    icon: BarChart3,
    title: "Audience Insights",
    description: "Get detailed analytics and insights about your audience engagement and growth metrics.",
  },
  {
    icon: TrendingUp,
    title: "Organic Brand Growth",
    description: "Build genuine relationships with your community through authentic content and collaborations.",
  },
  {
    icon: Shield,
    title: "Full Brand Control",
    description: "Maintain complete control over your brand identity while we handle the strategy and execution.",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-12 sm:py-16 md:py-20 bg-background tech-grid-dense relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-primary/5 blur-3xl" />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-block px-4 py-1 rounded-full border border-primary/20 bg-primary/5 text-sm font-medium text-primary mb-4">
            Core Features
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 px-4">
            Tech-Powered Growth
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Advanced tools and analytics to supercharge your creator collaborations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="p-5 sm:p-6 glass hover:shadow-neon transition-smooth cursor-pointer group tech-border-animate relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/20 to-transparent rounded-bl-full" />
              <div className="relative">
                <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all shadow-neon">
                  <feature.icon className="text-white" size={28} />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
