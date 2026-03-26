// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Download, CreditCard, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Link } from "react-router-dom";

interface Invoice {
  id: string;
  number: string;
  amount_paid: number;
  currency: string;
  status: string;
  created: number;
  invoice_pdf: string;
  hosted_invoice_url: string;
}

export default function SubscriptionManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);

  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user");
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["invoices", subscription?.stripe_customer_id],
    queryFn: async () => {
      if (!subscription?.stripe_customer_id) return [];
      
      const { data, error } = await supabase.functions.invoke("manage-subscription", {
        body: {
          action: "get_invoices",
          customerId: subscription.stripe_customer_id,
        },
      });

      if (error) throw error;
      return data.invoices as Invoice[];
    },
    enabled: !!subscription?.stripe_customer_id,
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!subscription?.stripe_subscription_id) throw new Error("No subscription");
      
      const { data, error } = await supabase.functions.invoke("manage-subscription", {
        body: {
          action: "cancel_subscription",
          subscriptionId: subscription.stripe_subscription_id,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Subscription will be cancelled at the end of the billing period");
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel subscription: ${error.message}`);
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      if (!subscription?.stripe_subscription_id) throw new Error("No subscription");
      
      const { data, error } = await supabase.functions.invoke("manage-subscription", {
        body: {
          action: "reactivate_subscription",
          subscriptionId: subscription.stripe_subscription_id,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Subscription reactivated successfully");
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to reactivate subscription: ${error.message}`);
    },
  });

  const handleDownloadInvoice = async (invoiceUrl: string) => {
    window.open(invoiceUrl, "_blank");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <Card>
            <CardHeader>
              <CardTitle>Sign In Required</CardTitle>
              <CardDescription>Please sign in to manage your subscription</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/auth">
                <Button>Sign In</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  if (subscriptionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <p className="text-muted-foreground">Loading subscription details...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <Card>
            <CardHeader>
              <CardTitle>No Active Subscription</CardTitle>
              <CardDescription>You don't have an active subscription yet</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/catalog">
                <Button>Browse Automations</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Subscription Management</h1>
            <p className="text-muted-foreground">Manage your subscription, billing, and invoices</p>
          </div>

          {/* Current Subscription */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Current Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="font-semibold">{subscription.bundle_name || "Custom Bundle"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                    {subscription.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Cost</p>
                  <p className="font-semibold">${subscription.total_amount?.toFixed(2) || "0.00"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Automations Included</p>
                  <p className="font-semibold">{subscription.automation_limit}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Period</p>
                  <p className="font-semibold">
                    {subscription.current_period_start && format(new Date(subscription.current_period_start), "MMM dd, yyyy")} - 
                    {subscription.current_period_end && format(new Date(subscription.current_period_end), "MMM dd, yyyy")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Renewal Date</p>
                  <p className="font-semibold">
                    {subscription.current_period_end && format(new Date(subscription.current_period_end), "MMM dd, yyyy")}
                  </p>
                </div>
              </div>

              {subscription.cancel_at_period_end && (
                <div className="flex items-center gap-2 p-4 bg-warning/10 rounded-lg border border-warning">
                  <AlertCircle className="h-5 w-5 text-warning" />
                  <div className="flex-1">
                    <p className="font-semibold">Subscription Ending</p>
                    <p className="text-sm text-muted-foreground">
                      Your subscription will end on {subscription.current_period_end && format(new Date(subscription.current_period_end), "MMMM dd, yyyy")}
                    </p>
                  </div>
                  <Button onClick={() => reactivateMutation.mutate()} disabled={reactivateMutation.isPending}>
                    Reactivate
                  </Button>
                </div>
              )}

              {!subscription.cancel_at_period_end && subscription.status === "active" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Cancel Subscription</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Your subscription will remain active until the end of your current billing period on{" "}
                        {subscription.current_period_end && format(new Date(subscription.current_period_end), "MMMM dd, yyyy")}.
                        You can reactivate at any time before then.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                      <AlertDialogAction onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
                        Cancel Subscription
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardContent>
          </Card>

          {/* Billing History */}
          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>View and download your invoices</CardDescription>
            </CardHeader>
            <CardContent>
              {invoicesLoading ? (
                <p className="text-muted-foreground">Loading invoices...</p>
              ) : invoices && invoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.number}</TableCell>
                        <TableCell>{format(new Date(invoice.created * 1000), "MMM dd, yyyy")}</TableCell>
                        <TableCell>${(invoice.amount_paid / 100).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={invoice.status === "paid" ? "default" : "secondary"}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadInvoice(invoice.invoice_pdf || invoice.hosted_invoice_url)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground">No invoices found</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
