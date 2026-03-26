import { Card } from "@/components/ui/card";
import { Sparkles, Megaphone, Users2, Target } from "lucide-react";
import { Link } from "react-router-dom";
const services = [{
  icon: Sparkles,
  title: "Creator Collaboration Hub (Kollabsy)",
  description: "Our proprietary platform connects you with vetted creators across all major social platforms. Find, manage, and track creator partnerships all in one place.",
  link: "/creator-partnerships"
}, {
  icon: Megaphone,
  title: "Organic Brand Campaigns",
  description: "We design and execute authentic campaigns that resonate with your target audience. From product launches to brand awareness, we create content that converts.",
  link: "/brand-campaigns"
}, {
  icon: Users2,
  title: "Audience & Community Insights",
  description: "Get deep insights into your audience demographics, behavior, and preferences. We help you understand what makes your community tick and how to grow it.",
  link: "/automations-support"
}, {
  icon: Target,
  title: "Brand Strategy & Growth Management",
  description: "From positioning to execution, we provide comprehensive brand strategy services. We help you define your unique voice and amplify it across all channels.",
  link: "/growth-strategy"
}];
const Services = () => {
  return <section id="services" className="py-12 sm:py-16 md:py-20 bg-background tech-grid-dense relative overflow-hidden">
      {/* Glowing background elements */}
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-block px-4 py-1 rounded-full border border-primary/20 bg-primary/5 text-sm font-medium text-primary mb-4">
            What We Offer
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 px-4">Enterprise-Grade Brand Growth Engine
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">Cutting-edge technology meets smart brand growth — connect, collaborate, and scale with creators effortlessly.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {services.map((service, index) => <Link key={index} to={service.link}>
              <Card className="p-6 sm:p-8 glass hover:shadow-neon transition-all group cursor-pointer tech-border-animate relative overflow-hidden h-full">
                {/* Corner accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-accent/10 to-transparent rounded-tr-full" />
                
                <div className="relative">
                  <div className="w-16 h-16 rounded-xl gradient-primary flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all shadow-neon">
                    <service.icon className="text-white" size={32} />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4 group-hover:text-primary transition-colors">{service.title}</h3>
                  <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">{service.description}</p>
                  
                  {/* Hover arrow indicator */}
                  <div className="mt-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                    <span className="text-sm font-medium">Explore</span>
                    <div className="w-6 h-0.5 bg-primary rounded-full group-hover:w-12 transition-all" />
                  </div>
                </div>
              </Card>
            </Link>)}
        </div>
      </div>
    </section>;
};
export default Services;