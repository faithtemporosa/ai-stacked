import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { type Automation } from "@/data/automations";
import { parseAutomationsCatalog } from "@/utils/parseAutomationsCatalog";
import { ArrowLeft, Check, Clock, TrendingUp, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import ROICalculator from "@/components/ROICalculator";
import { toLaymanProblem, toLaymanSolution, toLaymanHowItWorks, toLaymanDescription, toLaymanFeature, toLaymanName } from "@/utils/laymanDescriptions";
export default function AutomationDetail() {
  const {
    id
  } = useParams();
  const {
    toast
  } = useToast();
  const {
    addItem,
    items
  } = useCart();
  const [automation, setAutomation] = useState<Automation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    parseAutomationsCatalog().then(automations => {
      const found = automations.find(a => a.id === id);
      setAutomation(found || null);
      setIsLoading(false);
    });
  }, [id]);
  const isInCart = automation ? items.some(item => item.id === automation.id) : false;
  if (isLoading) {
    return <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 pt-28 pb-12">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">Loading...</p>
          </div>
        </main>
        <Footer />
      </div>;
  }
  if (!automation) {
    return <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 pt-28 pb-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Automation Not Found</h1>
            <Button asChild>
              <Link to="/catalog">Back to Catalog</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>;
  }
  const handleAddToCart = async () => {
    if (!automation) return;
    const cartItem = items.find(item => item.id === automation.id);
    
    try {
      await addItem({
        id: automation.id,
        name: automation.name,
        price: 99,
        hoursSaved: automation.hoursSaved,
        thumbnail: automation.thumbnail,
        quantity: 1
      });
      
      toast({
        title: cartItem ? "Quantity Updated! 🎉" : "Added to Cart! 🎉",
        description: cartItem ? `${automation.name} quantity increased to ${cartItem.quantity + 1}.` : `${automation.name} has been added to your cart.`
      });
    } catch (error) {
      // CartContext already handles error toasts
      console.error('Failed to add to cart:', error);
    }
  };
  return <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 pt-28 pb-12">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/catalog">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Catalog
          </Link>
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold">{toLaymanName(automation.name)}</h1>
                  <p className="text-xl text-muted-foreground">{toLaymanDescription(automation.description || '', automation.name, automation.category)}</p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {automation.category}
                </Badge>
              </div>
              
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <span><strong>{automation.hoursSaved} hours</strong> saved/month</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span><strong>${automation.monthlySavings}</strong> saved/month</span>
                </div>
                <div className="flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-muted-foreground" />
                  <span>Setup: <strong>{automation.setupTime}</strong></span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Problem → Solution */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-3 text-destructive">The Problem</h3>
                <p className="text-muted-foreground">{toLaymanProblem(automation.problemStatement, automation.category, automation.name)}</p>
              </Card>
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-3 text-green-600">The Solution</h3>
                <p className="text-muted-foreground">{toLaymanSolution(automation.solution, automation.category, automation.name)}</p>
              </Card>
            </div>

            {/* Workflow Steps */}
            <div>
              <h2 className="text-2xl font-bold mb-4">How It Works</h2>
              <p className="text-muted-foreground mb-6">
                {toLaymanHowItWorks(automation.solution, automation.name, automation.category)}
              </p>
              
            </div>

            {/* Features */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Key Features</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {automation.features.map((feature, index) => <div key={index} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <span>{toLaymanFeature(feature)}</span>
                  </div>)}
              </div>
            </div>

            {/* Use Cases */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Perfect For</h2>
              <div className="space-y-2">
                {automation.useCases.map((useCase, index) => <div key={index} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span>{useCase}</span>
                  </div>)}
              </div>
            </div>

            {/* Requirements */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Requirements</h2>
              <Card className="p-6">
                {automation.requirements.length > 0 ? (
                  <ul className="space-y-2.5">
                    {automation.requirements.map((req, index) => (
                      <li key={index} className="flex items-start gap-2.5 text-sm">
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-foreground">{req}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No special requirements</p>
                )}
              </Card>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 space-y-6">
              {/* Pricing Card */}
              <Card className="p-6">
                <div className="text-center space-y-4">
                  <div>
                    <div className="text-3xl font-bold">$99</div>
                    <div className="text-sm text-muted-foreground">per automation</div>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>2-3 automations: $89 each</div>
                    <div>4-6 automations: $79 each</div>
                    <div>7-10 automations: $69 each</div>
                    <div>11+ automations: $59 each</div>
                  </div>
                  <Button onClick={handleAddToCart} size="lg" className="w-full text-sm sm:text-base">
                    Add to Cart
                  </Button>
                </div>
              </Card>

              {/* Mini ROI Calculator */}
              <Card className="p-6">
                <h3 className="font-semibold mb-4">What This Saves You</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly Cost:</span>
                    <span className="font-semibold">$99</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hours Saved:</span>
                    <span className="font-semibold">{automation.hoursSaved}h/mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Money Saved:</span>
                    <span className="font-semibold text-green-600">${automation.monthlySavings}/mo</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimated Savings:</span>
                    <span className="font-bold text-green-600">${Math.max(0, automation.monthlySavings - 99)}/mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ROI:</span>
                    <span className="font-bold">{(automation.monthlySavings / 99).toFixed(1)}x</span>
                  </div>
                </div>
              </Card>

              {/* Setup Timeline */}
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Setup Timeline</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-sm">Day 1: Connect accounts</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-sm">Day 2: Build & configure</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-sm">Day 3: Test & optimize</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-600" />
                    <span className="text-sm font-semibold">Go Live!</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Full ROI Calculator */}
        <div className="mt-16">
          <ROICalculator />
        </div>
      </main>

      <Footer />
    </div>;
}