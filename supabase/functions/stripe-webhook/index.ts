import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Stripe webhook - server-to-server communication from Stripe only
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://api.stripe.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey || !webhookSecret) {
      throw new Error("Missing Stripe configuration");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const signature = req.headers.get("stripe-signature");
    
    if (!signature) {
      throw new Error("No stripe-signature header");
    }

    const body = await req.text();
    logStep("Verifying webhook signature");

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logStep("Signature verification failed", { error: errorMessage });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Event verified", { type: event.type, id: event.id });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { sessionId: session.id });

        if (session.mode === "subscription" && session.subscription) {
          // Get the subscription with line items
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string,
            { expand: ["items.data.price"] }
          );

          const lineItem = subscription.items.data[0];
          const quantity = lineItem.quantity || 1;
          const priceId = lineItem.price.id;
          const customerId = subscription.customer as string;

          logStep("Processing subscription", {
            subscriptionId: subscription.id,
            quantity,
            priceId,
            customerId
          });

          // Get customer details
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          const customerEmail = customer.email;
          const customerName = customer.name || "N/A";

          if (!customerEmail) {
            throw new Error("No customer email found");
          }

          // Find user by email
          const { data: userData, error: userError } = await supabaseClient.auth.admin.listUsers();
          if (userError) throw userError;

          const user = userData.users.find(u => u.email === customerEmail);
          if (!user) {
            logStep("User not found for email", { email: customerEmail });
            throw new Error("User not found");
          }

          // Get price details for bundle name
          const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
          const product = price.product as Stripe.Product;
          const bundleName = product.name || "Standard Bundle";
          
          // Calculate total amount
          const totalAmount = (subscription.items.data[0].price.unit_amount || 0) * quantity / 100;

          // Get automations from session metadata if available
          const automationsPurchased = session.metadata?.automations_purchased 
            ? session.metadata.automations_purchased.split(',') 
            : [];

          // Upsert subscription
          const { error: subError } = await supabaseClient
            .from("subscriptions")
            .upsert({
              user_id: user.id,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscription.id,
              stripe_price_id: priceId,
              automation_limit: quantity,
              automations_used: 0,
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              customer_name: customerName,
              customer_email: customerEmail,
              bundle_name: bundleName,
              total_amount: totalAmount,
              automations_purchased: automationsPurchased,
            }, {
              onConflict: "user_id"
            });

          if (subError) {
            logStep("Error upserting subscription", { error: subError });
            throw subError;
          }

          logStep("Subscription created/updated successfully");
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", { subscriptionId: subscription.id });

        const lineItem = subscription.items.data[0];
        const quantity = lineItem.quantity || 1;
        const priceId = lineItem.price.id;

        const { error: updateError } = await supabaseClient
          .from("subscriptions")
          .update({
            stripe_price_id: priceId,
            automation_limit: quantity,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq("stripe_subscription_id", subscription.id);

        if (updateError) {
          logStep("Error updating subscription", { error: updateError });
          throw updateError;
        }

        logStep("Subscription updated successfully");
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription deleted", { subscriptionId: subscription.id });

        const { error: deleteError } = await supabaseClient
          .from("subscriptions")
          .update({
            status: "canceled",
            cancel_at_period_end: false,
          })
          .eq("stripe_subscription_id", subscription.id);

        if (deleteError) {
          logStep("Error marking subscription as canceled", { error: deleteError });
          throw deleteError;
        }

        logStep("Subscription marked as canceled");
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment succeeded", { invoiceId: invoice.id });
        
        // Commission configuration: 25% for 1 year (365 days)
        const COMMISSION_RATE = 0.25;
        const COMMISSION_DURATION_DAYS = 365;
        
        if (invoice.subscription) {
          // Get subscription details to find user
          const { data: subData } = await supabaseClient
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_subscription_id", invoice.subscription)
            .single();

          if (subData?.user_id) {
            // Check if user was referred by an affiliate
            const { data: profile } = await supabaseClient
              .from("profiles")
              .select("referred_by, created_at")
              .eq("user_id", subData.user_id)
              .single();

            if (profile?.referred_by) {
              // Calculate if we're still within the 1-year commission window
              const referralDate = new Date(profile.created_at);
              const commissionExpiresAt = new Date(referralDate);
              commissionExpiresAt.setDate(commissionExpiresAt.getDate() + COMMISSION_DURATION_DAYS);
              const now = new Date();
              
              // Only record commission if within the 1-year window
              if (now < commissionExpiresAt) {
                // Get affiliate details
                const { data: affiliate } = await supabaseClient
                  .from("affiliates")
                  .select("id, commission_rate, status")
                  .eq("id", profile.referred_by)
                  .single();

                if (affiliate && affiliate.status === 'active') {
                  const paymentAmount = (invoice.amount_paid || 0) / 100;
                  const commissionRate = COMMISSION_RATE;
                  const commissionAmount = paymentAmount * commissionRate;

                  // Record commission with expiration date
                  const { error: commissionError } = await supabaseClient
                    .from("affiliate_commissions")
                    .insert({
                      affiliate_id: affiliate.id,
                      referred_user_id: subData.user_id,
                      subscription_id: null,
                      stripe_payment_id: invoice.id,
                      payment_amount: paymentAmount,
                      commission_amount: commissionAmount,
                      commission_rate: commissionRate,
                      commission_expires_at: commissionExpiresAt.toISOString(),
                      status: 'pending',
                      payment_type: invoice.billing_reason === 'subscription_create' ? 'initial' : 'recurring'
                    });

                  if (commissionError) {
                    logStep("Error recording commission", { error: commissionError });
                  } else {
                    // Note: Affiliate earnings are updated automatically by the update_affiliate_stats trigger
                    logStep("Commission recorded", { 
                      affiliateId: affiliate.id, 
                      amount: commissionAmount,
                      expiresAt: commissionExpiresAt.toISOString()
                    });
                  }
                }
              } else {
                logStep("Commission window expired for referral", { 
                  userId: subData.user_id,
                  referralDate: referralDate.toISOString(),
                  expiresAt: commissionExpiresAt.toISOString()
                });
              }
            }
          }

          // Ensure subscription is marked as active
          const { error: updateError } = await supabaseClient
            .from("subscriptions")
            .update({ status: "active" })
            .eq("stripe_subscription_id", invoice.subscription);

          if (updateError) {
            logStep("Error updating subscription status", { error: updateError });
          } else {
            logStep("Subscription marked as active");
          }
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        logStep("Charge refunded", { chargeId: charge.id });

        // Find and update any commissions associated with this payment
        const { data: commissions } = await supabaseClient
          .from("affiliate_commissions")
          .select("*")
          .eq("stripe_payment_id", charge.payment_intent || charge.id);

        if (commissions && commissions.length > 0) {
          for (const commission of commissions) {
            const { error: updateError } = await supabaseClient
              .from("affiliate_commissions")
              .update({ 
                status: 'refunded',
                notes: `Refunded on ${new Date().toISOString()}`
              })
              .eq("id", commission.id);

            if (updateError) {
              logStep("Error updating commission for refund", { error: updateError });
            } else {
              logStep("Commission marked as refunded", { commissionId: commission.id });
            }
          }
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
