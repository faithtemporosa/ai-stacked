import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckoutRequest {
  userId?: string;
  email: string;
  quantity: number;
  businessName?: string;
  website?: string;
  additionalInfo?: string;
  cartItems?: Array<{ name: string; id: string }>;
}

function pickPriceId(quantity: number): string {
  if (quantity === 1) return Deno.env.get("STRIPE_PRICE_STANDARD")!;
  if (quantity >= 2 && quantity <= 3) return Deno.env.get("STRIPE_PRICE_VOLUME_SAVER")!;
  if (quantity >= 4 && quantity <= 6) return Deno.env.get("STRIPE_PRICE_BUSINESS")!;
  if (quantity >= 7 && quantity <= 10) return Deno.env.get("STRIPE_PRICE_ENTERPRISE")!;
  return Deno.env.get("STRIPE_PRICE_MAXIMUM")!;
}

async function stripeRequest(endpoint: string, body: Record<string, unknown>, secretKey: string) {
  const formBody = new URLSearchParams();
  
  function addToForm(obj: Record<string, unknown>, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}[${key}]` : key;
      if (value !== null && value !== undefined) {
        if (typeof value === 'object' && !Array.isArray(value)) {
          addToForm(value as Record<string, unknown>, fullKey);
        } else if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (typeof item === 'object') {
              addToForm(item as Record<string, unknown>, `${fullKey}[${index}]`);
            } else {
              formBody.append(`${fullKey}[${index}]`, String(item));
            }
          });
        } else {
          formBody.append(fullKey, String(value));
        }
      }
    }
  }
  
  addToForm(body);
  
  const response = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody.toString(),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'Stripe API error');
  }
  
  return data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || 'http://localhost:8080';
    const appUrl = origin;

    if (!stripeSecretKey) {
      console.error('Missing STRIPE_SECRET_KEY');
      return new Response(
        JSON.stringify({ error: 'Stripe configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: CheckoutRequest = await req.json();
    const { userId, email, quantity, businessName, website, additionalInfo, cartItems } = body;

    console.log('Received checkout request:', { email, quantity, userId });

    if (!email || !quantity) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: email and quantity' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 999) {
      return new Response(
        JSON.stringify({ error: 'Quantity must be an integer between 1 and 999' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const priceId = pickPriceId(qty);
    console.log('Selected price ID:', priceId, 'for quantity:', qty);
    
    let couponId: string | undefined;
    let affiliateId: string | undefined;

    // Check if user has a referral discount available
    if (userId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: profile } = await supabase
        .from('profiles')
        .select('referred_by, referral_discount_applied')
        .eq('user_id', userId)
        .single();

      if (profile?.referred_by && !profile.referral_discount_applied) {
        const { data: affiliate } = await supabase
          .from('affiliates')
          .select('id, status')
          .eq('id', profile.referred_by)
          .single();

        if (affiliate?.status === 'active') {
          affiliateId = affiliate.id;
          
          // For referral discount, we'll create a coupon via API
          try {
            // List existing coupons to find our referral coupon
            const couponsResponse = await fetch('https://api.stripe.com/v1/coupons?limit=100', {
              headers: { 'Authorization': `Bearer ${stripeSecretKey}` },
            });
            const couponsData = await couponsResponse.json();
            
            let referralCoupon = couponsData.data?.find((c: { name: string }) => c.name === 'Referral Discount 10%');
            
            if (!referralCoupon) {
              referralCoupon = await stripeRequest('coupons', {
                name: 'Referral Discount 10%',
                percent_off: 10,
                duration: 'once',
              }, stripeSecretKey);
            }
            
            couponId = referralCoupon.id;
            
            await supabase
              .from('profiles')
              .update({ referral_discount_applied: true })
              .eq('user_id', userId);
            
            console.log('Applying 10% referral discount for user:', userId);
          } catch (couponError) {
            console.error('Error handling coupon:', couponError);
          }
        }
      }
    }

    console.log('Creating checkout session:', { email, quantity: qty, priceId, userId, hasDiscount: !!couponId });

    const sessionParams: Record<string, unknown> = {
      mode: 'subscription',
      'payment_method_types': ['card'],
      customer_email: email,
      'line_items': [{
        price: priceId,
        quantity: qty,
      }],
      success_url: `${appUrl}/my-orders?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/cart`,
      'metadata': {
        userId: userId || 'anonymous',
        businessName: businessName || '',
        website: website || '',
        additionalInfo: additionalInfo || '',
        automations_purchased: cartItems?.map(item => item.name).join(',') || '',
        affiliate_id: affiliateId || '',
      },
    };

    if (couponId) {
      sessionParams['discounts'] = [{ coupon: couponId }];
    }

    const session = await stripeRequest('checkout/sessions', sessionParams, stripeSecretKey);

    console.log('Checkout session created:', session.id);

    return new Response(
      JSON.stringify({ 
        url: session.url, 
        sessionId: session.id,
        discountApplied: !!couponId,
        discountPercent: couponId ? 10 : 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
