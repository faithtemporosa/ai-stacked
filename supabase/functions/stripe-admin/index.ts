import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PriceDetail {
  id: string;
  nickname: string | null;
  unitAmount: number | null;
  currency: string;
  recurring: { interval: string; intervalCount: number } | null;
  productId: string | null;
  productName: string;
  productDescription: string | null;
  configuredTier: string | null;
  active: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    
    if (!stripeSecretKey) {
      console.error('Missing STRIPE_SECRET_KEY');
      return new Response(
        JSON.stringify({ error: 'Stripe configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Fetch all active products
    const products = await stripe.products.list({ active: true, limit: 100 });
    console.log(`Fetched ${products.data.length} products`);

    // Fetch all active prices
    const prices = await stripe.prices.list({ active: true, limit: 100, expand: ['data.product'] });
    console.log(`Fetched ${prices.data.length} prices`);

    // Get configured price IDs from environment
    const configuredPriceIds: Record<string, string> = {
      STRIPE_PRICE_STANDARD: Deno.env.get('STRIPE_PRICE_STANDARD') || 'Not configured',
      STRIPE_PRICE_VOLUME_SAVER: Deno.env.get('STRIPE_PRICE_VOLUME_SAVER') || 'Not configured',
      STRIPE_PRICE_BUSINESS: Deno.env.get('STRIPE_PRICE_BUSINESS') || 'Not configured',
      STRIPE_PRICE_ENTERPRISE: Deno.env.get('STRIPE_PRICE_ENTERPRISE') || 'Not configured',
      STRIPE_PRICE_MAXIMUM: Deno.env.get('STRIPE_PRICE_MAXIMUM') || 'Not configured',
    };

    // Map prices with their products and match with configured tiers
    const priceDetails: PriceDetail[] = prices.data.map((price: Stripe.Price) => {
      const product = typeof price.product === 'object' ? price.product as Stripe.Product : null;
      const tierMatch = Object.entries(configuredPriceIds).find(([, id]) => id === price.id);
      
      return {
        id: price.id,
        nickname: price.nickname,
        unitAmount: price.unit_amount ? price.unit_amount / 100 : null,
        currency: price.currency,
        recurring: price.recurring ? {
          interval: price.recurring.interval,
          intervalCount: price.recurring.interval_count,
        } : null,
        productId: product?.id || null,
        productName: product?.name || 'Unknown Product',
        productDescription: product?.description || null,
        configuredTier: tierMatch ? tierMatch[0] : null,
        active: price.active,
      };
    });

    // Sort by tier configuration (configured first, then by amount)
    priceDetails.sort((a: PriceDetail, b: PriceDetail) => {
      if (a.configuredTier && !b.configuredTier) return -1;
      if (!a.configuredTier && b.configuredTier) return 1;
      return (a.unitAmount || 0) - (b.unitAmount || 0);
    });

    return new Response(
      JSON.stringify({
        products: products.data.map((p: Stripe.Product) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          active: p.active,
        })),
        prices: priceDetails,
        configuredTiers: configuredPriceIds,
        tierMapping: {
          '1 automation': { tier: 'STRIPE_PRICE_STANDARD', price: '$99/mo' },
          '2-3 automations': { tier: 'STRIPE_PRICE_VOLUME_SAVER', price: '$89/mo each' },
          '4-6 automations': { tier: 'STRIPE_PRICE_BUSINESS', price: '$79/mo each' },
          '7-10 automations': { tier: 'STRIPE_PRICE_ENTERPRISE', price: '$69/mo each' },
          '11+ automations': { tier: 'STRIPE_PRICE_MAXIMUM', price: '$59/mo each' },
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching Stripe data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
