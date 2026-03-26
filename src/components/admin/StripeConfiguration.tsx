// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "../../integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Loader2, RefreshCw, CheckCircle, XCircle, AlertCircle, CreditCard } from "lucide-react";
import { useToast } from "../../hooks/use-toast";

interface StripePrice {
  id: string;
  nickname: string | null;
  unitAmount: number | null;
  currency: string;
  recurring: {
    interval: string;
    intervalCount: number;
  } | null;
  productId: string | null;
  productName: string;
  productDescription: string | null;
  configuredTier: string | null;
  active: boolean;
}

interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
}

interface TierMapping {
  tier: string;
  price: string;
}

interface StripeData {
  products: StripeProduct[];
  prices: StripePrice[];
  configuredTiers: Record<string, string>;
  tierMapping: Record<string, TierMapping>;
}

export function StripeConfiguration() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StripeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchStripeData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: response, error: fnError } = await supabase.functions.invoke('stripe-admin');
      
      if (fnError) throw fnError;
      if (response.error) throw new Error(response.error);
      
      setData(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch Stripe data';
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStripeData();
  }, []);

  const getTierLabel = (tierKey: string) => {
    const labels: Record<string, string> = {
      STRIPE_PRICE_STANDARD: '1 automation ($99)',
      STRIPE_PRICE_VOLUME_SAVER: '2-3 automations ($89)',
      STRIPE_PRICE_BUSINESS: '4-6 automations ($79)',
      STRIPE_PRICE_ENTERPRISE: '7-10 automations ($69)',
      STRIPE_PRICE_MAXIMUM: '11+ automations ($59)',
    };
    return labels[tierKey] || tierKey;
  };

  const getStatusIcon = (isConfigured: boolean) => {
    return isConfigured ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <AlertCircle className="h-4 w-4 text-yellow-500" />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Error Loading Stripe Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchStripeData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Stripe Configuration
          </h2>
          <p className="text-muted-foreground">
            View and verify your Stripe products and pricing tiers
          </p>
        </div>
        <Button onClick={fetchStripeData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Configured Pricing Tiers */}
      <Card>
        <CardHeader>
          <CardTitle>Configured Pricing Tiers</CardTitle>
          <CardDescription>
            Environment variables mapping to Stripe price IDs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tier</TableHead>
                <TableHead>Expected Price</TableHead>
                <TableHead>Stripe Price ID</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.tierMapping && Object.entries(data.tierMapping).map(([label, info]) => {
                const configuredId = data.configuredTiers[info.tier];
                const matchingPrice = data.prices.find(p => p.id === configuredId);
                const isValid = matchingPrice && matchingPrice.active;
                
                return (
                  <TableRow key={info.tier}>
                    <TableCell className="font-medium">{label}</TableCell>
                    <TableCell>{info.price}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {configuredId || 'Not configured'}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(!!isValid)}
                        {isValid ? (
                          <Badge variant="default" className="bg-green-500">
                            Active
                          </Badge>
                        ) : configuredId === 'Not configured' ? (
                          <Badge variant="destructive">Missing</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        {matchingPrice && (
                          <span className="text-sm text-muted-foreground">
                            (${matchingPrice.unitAmount}/{matchingPrice.recurring?.interval})
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
