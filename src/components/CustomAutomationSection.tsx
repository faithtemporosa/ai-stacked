import { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Card } from "./ui/card";
import { useCart } from "../contexts/CartContext";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const CustomAutomationSection = () => {
  const [description, setDescription] = useState("");
  const { addItem } = useCart();

  const handleAddToCart = () => {
    if (!description.trim()) {
      toast.error("Please describe your custom automation");
      return;
    }

    const customAutomation: any = {
      id: `custom-${Date.now()}`,
      name: `Custom Automation: ${description.slice(0, 50)}${description.length > 50 ? '...' : ''}`,
      price: 99,
      hoursSaved: 10,
      thumbnail: "",
      quantity: 1,
    };

    addItem(customAutomation);
    toast.success("Custom automation added to cart!");
    setDescription("");
  };

  return (
    <Card className="p-8 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <div className="flex items-center gap-3 mb-4">
        <Sparkles className="h-6 w-6 text-primary" />
        <h3 className="text-2xl font-bold">Need a Custom Automation?</h3>
      </div>
      <p className="text-muted-foreground mb-4">
        Don't see what you need? Describe your custom automation and we'll build it for you - just $99 (standard tier pricing)
      </p>
      <Textarea
        placeholder="Describe the automation you need... (e.g., 'Sync customer data between Shopify and HubSpot every hour')"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="mb-4 min-h-[120px]"
      />
      <Button onClick={handleAddToCart} className="w-full">
        Add Custom Automation to Cart - $99
      </Button>
    </Card>
  );
};
