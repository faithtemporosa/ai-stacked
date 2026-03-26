import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FuturisticBackground } from "@/components/FuturisticBackground";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { categories, type Automation, type AutomationCategory } from "@/data/automations";
import { parseAutomationsCatalog } from "@/utils/parseAutomationsCatalog";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";

type QuizStep = "goals" | "tools" | "role" | "results";

export default function BuildMyStack() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<QuizStep>("goals");
  const [selectedGoals, setSelectedGoals] = useState<AutomationCategory[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [role, setRole] = useState("");
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    parseAutomationsCatalog().then(data => {
      setAutomations(data);
      setIsLoading(false);
    });
  }, []);

  const steps: QuizStep[] = ["goals", "tools", "role", "results"];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const tools = [
    "Gmail", "Google Drive", "Google Sheets", "Google Docs", "Google Calendar", "Notion", 
    "Slack", "Shopify", "Stripe", "Webflow", "Excel", "Supabase", "HubSpot",
    "Airtable", "Trello", "Asana", "Monday.com", "ClickUp", "Mailchimp",
    "ActiveCampaign", "YouTube", "Pinterest", "Discord", "Telegram", "WhatsApp", 
    "WordPress", "Wix", "WooCommerce", "BigCommerce", "Calendly", "Zoom", "Google Meet", "Microsoft Teams",
    "Salesforce", "Pipedrive", "Zendesk", "Intercom", "Typeform", "Baserow",
    "OpenAI", "Cloudinary", "LangChain"
  ];

  const roles = [
    "Founder", "Marketer", "Sales", "Creator", "Operations Manager", "eCommerce Owner",
    "Developer", "Designer", "Product Manager", "Customer Success", "Consultant",
    "Agency Owner", "Freelancer", "Content Manager", "Social Media Manager",
    "HR Manager", "Finance Manager", "Business Owner", "Entrepreneur", "Coach", "Other"
  ];

  const handleGoalToggle = (category: AutomationCategory) => {
    setSelectedGoals((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleToolToggle = (tool: string) => {
    setSelectedTools((prev) =>
      prev.includes(tool)
        ? prev.filter((t) => t !== tool)
        : [...prev, tool]
    );
  };

  const getRecommendedAutomations = (): Automation[] => {
    // First, try to get recommendations based on user selections
    let recommendations = automations.filter((automation) => {
      const categoryMatch = selectedGoals.length === 0 || selectedGoals.includes(automation.category);
      const toolMatch = selectedTools.length === 0 || automation.tools.some(tool => 
        selectedTools.some(selectedTool => tool.toLowerCase().includes(selectedTool.toLowerCase()))
      );
      return categoryMatch && toolMatch;
    });

    // If we have enough recommendations, return them
    if (recommendations.length >= 5) {
      return recommendations.slice(0, 5);
    }

    // If we have some but not enough, try relaxing the tool constraint
    if (recommendations.length < 5 && selectedTools.length > 0) {
      const categoryOnlyMatches = automations.filter((automation) => {
        const categoryMatch = selectedGoals.length === 0 || selectedGoals.includes(automation.category);
        return categoryMatch && !recommendations.some(r => r.id === automation.id);
      });
      recommendations = [...recommendations, ...categoryOnlyMatches].slice(0, 5);
    }

    // If still not enough, add popular automations based on high ROI
    if (recommendations.length < 5) {
      const popularAutomations = automations
        .filter(a => !recommendations.some(r => r.id === a.id))
        .sort((a, b) => {
          // Sort by ROI level first, then hours saved
          const roiOrder = { high: 3, medium: 2, low: 1 };
          const roiDiff = (roiOrder[b.roiLevel] || 0) - (roiOrder[a.roiLevel] || 0);
          if (roiDiff !== 0) return roiDiff;
          return b.hoursSaved - a.hoursSaved;
        });
      
      recommendations = [...recommendations, ...popularAutomations].slice(0, 5);
    }

    // Final fallback: if somehow still no recommendations, return first 5
    if (recommendations.length === 0) {
      return automations.slice(0, 5);
    }

    return recommendations;
  };

  const calculateTotals = (recommendedAutomations: Automation[]) => {
    const count = recommendedAutomations.length;
    const basePrice = 99;
    
    // Tiered pricing based on quantity
    let effectivePrice: number;
    if (count === 1) effectivePrice = 99;
    else if (count >= 2 && count <= 3) effectivePrice = 89;
    else if (count >= 4 && count <= 6) effectivePrice = 79;
    else if (count >= 7 && count <= 10) effectivePrice = 69;
    else effectivePrice = 59; // 11+
    
    const totalCost = count * effectivePrice;
    const discountRate = (basePrice - effectivePrice) / basePrice;
    const totalHoursSaved = recommendedAutomations.reduce((sum, a) => sum + a.hoursSaved, 0);
    const totalSavings = recommendedAutomations.reduce((sum, a) => sum + a.monthlySavings, 0);
    const netGain = totalSavings - totalCost;

    return { count, totalCost, totalHoursSaved, totalSavings, netGain, discountRate };
  };

  const nextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const prevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case "goals":
        return selectedGoals.length > 0;
      case "tools":
        return true; // Optional
      case "role":
        return role !== "";
      default:
        return true;
    }
  };

  const handleAddBundleToCart = async () => {
    const recommended = getRecommendedAutomations();
    
    try {
      // Add all items sequentially to avoid race conditions
      for (const automation of recommended) {
        await addItem({
          id: automation.id,
          name: automation.name,
          price: 99,
          hoursSaved: automation.hoursSaved,
          thumbnail: automation.thumbnail,
          quantity: 1,
        });
      }

      toast({
        title: "Bundle added to cart!",
        description: `${recommended.length} automation${recommended.length > 1 ? 's' : ''} added to your cart`,
      });

      navigate("/cart");
    } catch (error) {
      // CartContext already handles error toasts
      console.error('Failed to add bundle to cart:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <FuturisticBackground />
      <Header />
      
      <main className="flex-1 container mx-auto px-4 pt-28 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Button variant="ghost" asChild className="mb-4">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Link>
            </Button>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Build Your Automation Stack</h1>
            <p className="text-base sm:text-lg text-muted-foreground">
              Answer a few questions to get personalized automation recommendations
            </p>
            <div className="mt-6">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">
                Step {currentStepIndex + 1} of {steps.length}
              </p>
            </div>
          </div>

          <Card className="p-4 sm:p-6 md:p-8">
            {/* Step 1: Goals */}
            {currentStep === "goals" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold mb-2">What do you want to automate?</h2>
                  <p className="text-muted-foreground">Select all that apply</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {categories.map((category) => (
                    <div
                      key={category}
                      onClick={() => handleGoalToggle(category)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedGoals.includes(category)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{category}</span>
                        {selectedGoals.includes(category) && (
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Tools */}
            {currentStep === "tools" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold mb-2">What tools do you use?</h2>
                  <p className="text-muted-foreground">Select all that apply (optional)</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {tools.map((tool) => (
                    <div key={tool} className="flex items-center space-x-2">
                      <Checkbox
                        id={`tool-${tool}`}
                        checked={selectedTools.includes(tool)}
                        onCheckedChange={() => handleToolToggle(tool)}
                      />
                      <Label htmlFor={`tool-${tool}`} className="cursor-pointer">
                        {tool}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Role */}
            {currentStep === "role" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold mb-2">What's your role?</h2>
                  <p className="text-muted-foreground">This helps us tailor recommendations</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {roles.map((roleOption) => (
                    <div
                      key={roleOption}
                      onClick={() => setRole(roleOption)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        role === roleOption
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{roleOption}</span>
                        {role === roleOption && (
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Results */}
            {currentStep === "results" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold mb-4">Your Recommended Stack</h2>
                  <p className="text-muted-foreground mb-6">
                    Based on your answers, here's what we recommend:
                  </p>
                </div>

                {(() => {
                  const recommended = getRecommendedAutomations();
                  const totals = calculateTotals(recommended);

                  return (
                    <>
                      {/* Summary Card */}
                      <Card className="p-4 sm:p-6 bg-primary/5 border-primary/20">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs sm:text-sm text-muted-foreground">Automations</p>
                            <p className="text-xl sm:text-2xl font-bold">{totals.count}</p>
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm text-muted-foreground">Monthly Cost</p>
                            <p className="text-xl sm:text-2xl font-bold">${Math.round(totals.totalCost)}</p>
                            {totals.discountRate > 0 && (
                              <Badge variant="secondary" className="mt-1 text-xs">
                                {Math.round(totals.discountRate * 100)}% off
                              </Badge>
                            )}
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm text-muted-foreground">Hours Saved</p>
                            <p className="text-xl sm:text-2xl font-bold">{totals.totalHoursSaved}h/mo</p>
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm text-muted-foreground">Estimated Savings</p>
                            <p className="text-xl sm:text-2xl font-bold text-green-600">
                              ${Math.round(totals.netGain)}
                            </p>
                          </div>
                        </div>
                      </Card>

                      {/* Recommended Automations */}
                      <div className="space-y-4">
                        {recommended.map((automation) => (
                          <Card key={automation.id} className="p-4 hover:shadow-lg transition-shadow">
                            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="font-semibold text-base sm:text-lg mb-1">{automation.name}</h3>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {automation.description}
                                </p>
                                <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
                                  <Badge variant="outline">{automation.hoursSaved}h saved</Badge>
                                  <Badge variant="outline">${automation.monthlySavings} saved</Badge>
                                </div>
                              </div>
                              <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                                <Link to={`/automation/${automation.id}`}>Details</Link>
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>

                      {/* CTAs */}
                      <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <Button 
                          size="lg" 
                          className="flex-1 gradient-primary shadow-glow"
                          onClick={handleAddBundleToCart}
                        >
                          Add Bundle to Cart
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Navigation */}
            {currentStep !== "results" && (
              <div className="flex justify-between mt-8 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStepIndex === 0}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className="gradient-primary"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
