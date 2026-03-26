// @ts-nocheck
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FuturisticBackground } from "@/components/FuturisticBackground";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  brand: z.string().trim().min(1, "Brand name is required").max(100),
  message: z.string().trim().min(1, "Message is required").max(1000)
});

const GetStarted = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    brand: "",
    message: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Scroll to center the form on page load
    const timer = setTimeout(() => {
      const formElement = document.getElementById("contact-form");
      if (formElement) {
        const elementPosition = formElement.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - (window.innerHeight / 2) + (formElement.offsetHeight / 2);
        
        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        });
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      contactSchema.parse(formData);

      const { error: dbError } = await supabase
        .from('contact_submissions')
        .insert({
          name: formData.name,
          email: formData.email,
          brand_name: formData.brand,
          message: formData.message,
        });

      if (dbError) {
        throw new Error('Failed to save submission');
      }

      toast({
        title: "Message sent!",
        description: "We'll get back to you within 24 hours."
      });

      setFormData({
        name: "",
        email: "",
        brand: "",
        message: ""
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
        toast({
          title: "Validation Error",
          description: "Please check the form for errors.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      <FuturisticBackground />
      <Header />
      
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 tech-grid relative overflow-hidden">
        <div className="absolute top-10 left-10 w-40 h-40 border-2 border-primary/20 rounded-lg rotate-12 animate-float pointer-events-none hidden sm:block" />
        <div className="absolute bottom-10 right-10 w-32 h-32 border-2 border-accent/20 rounded-full animate-pulse-glow pointer-events-none hidden sm:block" />
        
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12 sm:mb-16">
              <div className="inline-block px-4 py-1 rounded-full border border-accent/20 bg-accent/5 text-sm font-medium text-accent mb-4">
                Let's Connect
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 px-4">Ready to Scale Your Brand?</h1>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground px-4">
                Transform your brand with AI-powered creator partnerships.
              </p>
            </div>

            <Card id="contact-form" className="p-6 sm:p-8 md:p-12 glass tech-border-animate shadow-neon">
              <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-2">
                      Your Name *
                    </label>
                    <Input 
                      id="name" 
                      name="name" 
                      value={formData.name} 
                      onChange={handleChange} 
                      placeholder="John Doe" 
                      className={errors.name ? "border-destructive" : ""}
                      disabled={isSubmitting}
                    />
                    {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                      Email Address *
                    </label>
                    <Input 
                      id="email" 
                      name="email" 
                      type="email" 
                      value={formData.email} 
                      onChange={handleChange} 
                      placeholder="john@example.com" 
                      className={errors.email ? "border-destructive" : ""}
                      disabled={isSubmitting}
                    />
                    {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="brand" className="block text-sm font-medium mb-2">
                    Brand Name *
                  </label>
                  <Input 
                    id="brand" 
                    name="brand" 
                    value={formData.brand} 
                    onChange={handleChange} 
                    placeholder="Your Brand" 
                    className={errors.brand ? "border-destructive" : ""}
                    disabled={isSubmitting}
                  />
                  {errors.brand && <p className="text-sm text-destructive mt-1">{errors.brand}</p>}
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium mb-2">
                    Tell Us About Your Goals *
                  </label>
                  <Textarea 
                    id="message" 
                    name="message" 
                    value={formData.message} 
                    onChange={handleChange} 
                    placeholder="What are your brand growth goals? What challenges are you facing?" 
                    rows={5} 
                    className={errors.message ? "border-destructive" : ""}
                    disabled={isSubmitting}
                  />
                  {errors.message && <p className="text-sm text-destructive mt-1">{errors.message}</p>}
                </div>

                <Button type="submit" size="lg" className="w-full gradient-primary shadow-glow text-lg" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default GetStarted;