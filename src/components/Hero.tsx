import { Button } from "./ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "../assets/hero-image.jpg";
import aiLogo from "../assets/ai-brand-logo.png";
const Hero = () => {
  const scrollToContact = () => {
    const element = document.getElementById("contact");
    if (element) {
      element.scrollIntoView({
        behavior: "smooth"
      });
    }
  };
  const scrollToAbout = () => {
    const element = document.getElementById("about");
    if (element) {
      element.scrollIntoView({
        behavior: "smooth"
      });
    }
  };
  return <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 sm:pt-0 bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      {/* Animated background elements */}
      <div className="absolute inset-0 z-0">
        <img src={heroImage} alt="Brand growth and creator collaborations" className="w-full h-full object-cover opacity-10" />
        
        {/* Floating geometric shapes with retro colors */}
        <div className="absolute top-20 left-10 w-24 h-24 bg-gradient-to-br from-primary to-secondary rounded-3xl rotate-45 animate-float opacity-20" />
        <div className="absolute bottom-40 right-20 w-40 h-40 bg-gradient-to-br from-accent to-tertiary rounded-full animate-float opacity-20" style={{
        animationDelay: "1s"
      }} />
        <div className="absolute top-1/3 right-10 w-20 h-20 bg-gradient-to-br from-secondary to-primary rounded-2xl rotate-12 animate-float opacity-20" style={{
        animationDelay: "2s"
      }} />
        
        {/* Glowing orbs with retro colors */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse-glow" style={{
        animationDelay: "1.5s"
      }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-accent/20 rounded-full blur-3xl animate-pulse-glow" style={{
        animationDelay: "0.7s"
      }} />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-20 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex flex-col items-center mb-4 sm:mb-6 animate-fade-in">
            <img src={aiLogo} alt="AI" className="h-24 sm:h-32 md:h-40 lg:h-48 w-auto mb-4" />
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Save Time. Make Money.
            </h1>
          </div>
          
          <p className="text-base sm:text-xl md:text-2xl mb-6 sm:mb-8 text-muted-foreground max-w-3xl mx-auto px-4 animate-fade-in" style={{
          animationDelay: "0.1s"
        }}>
            Done-for-you AI + automation systems that save you hours every week. Get your time back while your business runs smoother than ever.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center animate-fade-in px-4" style={{
          animationDelay: "0.2s"
        }}>
            <Link to="/catalog" className="w-full sm:w-auto">
              <Button size="lg" variant="retro" className="text-base sm:text-lg px-6 sm:px-8 group w-full sm:w-auto">
                Browse Automations <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
              </Button>
            </Link>
            <Link to="/build-my-stack" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto">
                Take the Quiz <Sparkles className="ml-2" size={20} />
              </Button>
            </Link>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-3 sm:gap-6 md:gap-8 mt-12 sm:mt-16 max-w-3xl mx-auto px-4 animate-fade-in" style={{
          animationDelay: "0.3s"
        }}>
            <div className="bg-card/80 backdrop-blur-sm p-3 sm:p-4 rounded-3xl border-2 border-primary/20 hover:border-primary/40 transition-all hover:scale-105">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">500+</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Automations</div>
            </div>
            <div className="bg-card/80 backdrop-blur-sm p-3 sm:p-4 rounded-3xl border-2 border-secondary/20 hover:border-secondary/40 transition-all hover:scale-105">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">10K+</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Hours Saved</div>
            </div>
            <div className="bg-card/80 backdrop-blur-sm p-3 sm:p-4 rounded-3xl border-2 border-accent/20 hover:border-accent/40 transition-all hover:scale-105">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-accent to-tertiary bg-clip-text text-transparent">$2M+</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Value Created</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
        <div className="w-6 h-10 border-2 border-primary rounded-full flex items-start justify-center p-2">
          <div className="w-1.5 h-3 bg-primary rounded-full" />
        </div>
      </div>
    </section>;
};
export default Hero;