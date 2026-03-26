import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const getAllowedOrigin = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  return supabaseUrl.replace('.supabase.co', '.lovable.app').replace('https://api.', 'https://');
};

const corsHeaders = {
  'Access-Control-Allow-Origin': getAllowedOrigin(),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function runs on a schedule (every day) and processes payouts for affiliates
// who are due for their 60-day payout cycle
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[AFFILIATE-PAYOUT] Starting automatic payout processing');

    const now = new Date();
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Get all active affiliates who:
    // 1. Have pending earnings >= $50
    // 2. Haven't had a payout in the last 60 days OR never had a payout
    const { data: affiliates, error: affiliatesError } = await supabase
      .from('affiliates')
      .select('*')
      .eq('status', 'active')
      .gte('pending_earnings', 50)
      .or(`last_payout_date.is.null,last_payout_date.lt.${sixtyDaysAgo.toISOString()}`);

    if (affiliatesError) {
      console.error('[AFFILIATE-PAYOUT] Error fetching affiliates:', affiliatesError);
      throw affiliatesError;
    }

    console.log(`[AFFILIATE-PAYOUT] Found ${affiliates?.length || 0} affiliates due for payout`);

    const results = [];

    for (const affiliate of affiliates || []) {
      // Check if they already have a pending payout request
      const { data: existingPayout } = await supabase
        .from('affiliate_payouts')
        .select('id')
        .eq('affiliate_id', affiliate.id)
        .eq('status', 'pending')
        .single();

      if (existingPayout) {
        console.log(`[AFFILIATE-PAYOUT] Skipping ${affiliate.referral_code} - already has pending payout`);
        continue;
      }

      // Check if they have payout details configured based on method
      const payoutMethod = affiliate.payout_method || 'paypal';
      let hasPayoutDetails = false;
      let payoutDetails: Record<string, unknown> = {
        auto_generated: true,
        cycle_date: now.toISOString()
      };

      if (payoutMethod === 'paypal' && affiliate.paypal_email) {
        hasPayoutDetails = true;
        payoutDetails.paypal_email = affiliate.paypal_email;
      } else if (payoutMethod === 'venmo' && affiliate.venmo_username) {
        hasPayoutDetails = true;
        payoutDetails.venmo_username = affiliate.venmo_username;
      } else if (payoutMethod === 'bank' && affiliate.bank_account_name && affiliate.bank_routing_number && affiliate.bank_account_number) {
        hasPayoutDetails = true;
        payoutDetails.bank_account_name = affiliate.bank_account_name;
        payoutDetails.bank_routing_number = affiliate.bank_routing_number;
        payoutDetails.bank_account_number = affiliate.bank_account_number;
      }

      if (!hasPayoutDetails) {
        console.log(`[AFFILIATE-PAYOUT] Skipping ${affiliate.referral_code} - no payout details configured for ${payoutMethod}`);
        continue;
      }

      // Create automatic payout
      const { data: payout, error: payoutError } = await supabase
        .from('affiliate_payouts')
        .insert({
          affiliate_id: affiliate.id,
          amount: affiliate.pending_earnings,
          payout_method: payoutMethod,
          payout_details: payoutDetails,
          status: 'pending'
        })
        .select()
        .single();

      if (payoutError) {
        console.error(`[AFFILIATE-PAYOUT] Error creating payout for ${affiliate.referral_code}:`, payoutError);
        results.push({ affiliate_id: affiliate.id, success: false, error: payoutError.message });
      } else {
        console.log(`[AFFILIATE-PAYOUT] Created payout for ${affiliate.referral_code}: $${affiliate.pending_earnings}`);
        results.push({ 
          affiliate_id: affiliate.id, 
          success: true, 
          payout_id: payout.id, 
          amount: affiliate.pending_earnings 
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: results.length,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[AFFILIATE-PAYOUT] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
