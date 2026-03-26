// @ts-nocheck
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Package, LogIn } from "lucide-react";
import { format } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { toLaymanDescription } from "../utils/laymanDescriptions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";

const MyOrders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["subscriptions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Get all automation IDs from all orders
  const allAutomationIds = useMemo(() => {
    if (!orders) return [];
    const ids = new Set<string>();
    orders.forEach(order => {
      order.automations_purchased?.forEach((name: string) => {
        // Convert name to ID format (lowercase, hyphenated)
        ids.add(name.toLowerCase().replace(/\s+/g, '-'));
      });
    });
    return Array.from(ids);
  }, [orders]);

  // Fetch automation details for descriptions
  const { data: automationDetails } = useQuery({
    queryKey: ["order-automation-details", allAutomationIds],
    queryFn: async () => {
      if (allAutomationIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from("automations")
        .select("id, name, description, category")
        .in("id", allAutomationIds);
      
      if (error) throw error;
      
      // Create a map by both ID and name for flexible lookup
      const detailsMap: Record<string, { description: string | null; category: string }> = {};
      (data || []).forEach(item => {
        detailsMap[item.id] = { description: item.description, category: item.category };
        detailsMap[item.name.toLowerCase()] = { description: item.description, category: item.category };
      });
      return detailsMap;
    },
    enabled: allAutomationIds.length > 0,
  });

  // Redirect users without subscriptions
  useEffect(() => {
    if (!isLoading && user && orders && orders.length === 0) {
      toast.info("You need an active subscription to view orders");
      navigate("/catalog");
    }
  }, [isLoading, user, orders, navigate]);


  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-16 pt-24">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex justify-between items-start">
            <div className="text-center flex-1 space-y-4">
              <h1 className="text-4xl font-bold">My Subscriptions</h1>
              <p className="text-muted-foreground">
                {user ? "View and manage your automation subscriptions" : "Sign in to view your subscriptions"}
              </p>
            </div>
            {user && orders && orders.length > 0 && (
              <Link to="/subscription-management">
                <Button variant="outline">Manage Subscription</Button>
              </Link>
            )}
          </div>

          {!user ? (
            <Card className="p-12 text-center space-y-6">
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/10 p-6">
                  <Package className="w-12 h-12 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Please Sign In to View Your Subscriptions</h2>
                <p className="text-muted-foreground">
                  Your subscription details are private and secure. Sign in to access your active subscriptions and manage your automation limits.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button asChild size="lg" className="gap-2">
                  <Link to="/auth">
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/catalog">Browse Automations</Link>
                </Button>
              </div>
            </Card>
          ) : (
            <>
              {isLoading && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Loading subscriptions...</p>
                </div>
              )}

              {!isLoading && orders && orders.length === 0 && (
                <Card className="p-12 text-center">
                  <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No active subscriptions found.
                  </p>
                </Card>
              )}

              {orders && orders.length > 0 && (
                <div className="space-y-4">
                  {orders.map((subscription) => (
                    <Card key={subscription.id} className="p-6 hover:shadow-lg transition-shadow">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h3 className="text-lg font-semibold">
                              {subscription.bundle_name || 'Subscription'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Started on {format(new Date(subscription.created_at), "PPP")}
                            </p>
                            {subscription.customer_name && (
                              <p className="text-sm text-muted-foreground">
                                Customer: {subscription.customer_name}
                              </p>
                            )}
                          </div>
                          <div className="text-right space-y-2">
                            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                              subscription.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
                              subscription.status === 'canceled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' :
                              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                            }`}>
                              {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                            </div>
                            {subscription.total_amount > 0 && (
                              <p className="text-lg font-bold">${subscription.total_amount}</p>
                            )}
                          </div>
                        </div>

                        {subscription.automations_purchased && subscription.automations_purchased.length > 0 && (
                          <div className="border-t pt-4">
                            <p className="text-sm font-medium mb-2">Automations Purchased</p>
                            <div className="flex flex-wrap gap-2">
                              <TooltipProvider>
                                {subscription.automations_purchased.map((automation: string, idx: number) => {
                                  const automationId = automation.toLowerCase().replace(/\s+/g, '-');
                                  const details = automationDetails?.[automationId] || automationDetails?.[automation.toLowerCase()];
                                  const laymanDescription = details?.description 
                                    ? toLaymanDescription(details.description, automation, details.category)
                                    : null;
                                  
                                  return (
                                    <Tooltip key={idx}>
                                      <TooltipTrigger asChild>
                                        <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded cursor-help">
                                          {automation}
                                        </span>
                                      </TooltipTrigger>
                                      {laymanDescription && (
                                        <TooltipContent className="max-w-xs">
                                          <p className="text-sm">{laymanDescription}</p>
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                  );
                                })}
                              </TooltipProvider>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                          <div>
                            <p className="text-sm font-medium">Automation Limit</p>
                            <p className="text-sm text-muted-foreground">
                              {subscription.automations_used} / {subscription.automation_limit} used
                            </p>
                          </div>
                          
                          {subscription.current_period_end && (
                            <div>
                              <p className="text-sm font-medium">Current Period Ends</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(subscription.current_period_end), "PPP")}
                              </p>
                            </div>
                          )}

                          {subscription.customer_email && (
                            <div>
                              <p className="text-sm font-medium">Email</p>
                              <p className="text-sm text-muted-foreground">
                                {subscription.customer_email}
                              </p>
                            </div>
                          )}
                        </div>

                        {subscription.stripe_customer_id && (
                          <div className="border-t pt-4">
                            <p className="text-sm font-medium">Customer ID</p>
                            <p className="text-sm text-muted-foreground font-mono">
                              {subscription.stripe_customer_id}
                            </p>
                          </div>
                        )}

                        {subscription.cancel_at_period_end && (
                          <div className="border-t pt-4 bg-yellow-50 dark:bg-yellow-900/20 -m-6 mt-4 p-4 rounded-b-lg">
                            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                              Subscription will cancel at period end
                            </p>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default MyOrders;
