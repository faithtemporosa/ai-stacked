import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Chen",
    brand: "EcoWear Apparel",
    text: "Bump Syndicate helped us grow from 10K to 100K followers in just 6 months. The creator partnerships were authentic and drove real engagement.",
    rating: 5,
  },
  {
    name: "Michael Torres",
    brand: "FitFuel Nutrition",
    text: "The team's approach to organic growth is refreshing. We saw a 300% increase in qualified leads through their creator campaigns.",
    rating: 5,
  },
  {
    name: "Emma Rodriguez",
    brand: "TechStyle Gadgets",
    text: "Working with Bump Syndicate was a game-changer. They matched us with creators who genuinely loved our products.",
    rating: 5,
  },
];

const Testimonials = () => {
  return (
    <section className="py-12 sm:py-16 md:py-20 bg-secondary">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            What Our Clients Say
          </h2>
          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Join hundreds of brands that have accelerated their growth with Bump Syndicate.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="p-6 hover:shadow-glow transition-smooth">
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="fill-accent text-accent" size={20} />
                ))}
              </div>
              <p className="text-foreground mb-4 italic">"{testimonial.text}"</p>
              <div className="border-t pt-4">
                <p className="font-semibold">{testimonial.name}</p>
                <p className="text-sm text-muted-foreground">{testimonial.brand}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
