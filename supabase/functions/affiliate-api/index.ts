import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AES-256-GCM encryption using Web Crypto API
let encryptionKeyCache: CryptoKey | null = null;
let encryptionEnabled = true;

async function getEncryptionKey(): Promise<CryptoKey | null> {
  if (encryptionKeyCache) return encryptionKeyCache;
  
  const keyHex = Deno.env.get('CREDENTIALS_ENCRYPTION_KEY');
  if (!keyHex) {
    console.warn('CREDENTIALS_ENCRYPTION_KEY not configured - encryption disabled');
    encryptionEnabled = false;
    return null;
  }
  
  // Validate key length (should be 64 hex chars for 256-bit key)
  if (keyHex.length !== 64) {
    console.warn(`Invalid CREDENTIALS_ENCRYPTION_KEY length: ${keyHex.length} chars (expected 64 hex chars) - encryption disabled`);
    encryptionEnabled = false;
    return null;
  }
  
  try {
    const keyData = new Uint8Array(keyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    
    encryptionKeyCache = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    return encryptionKeyCache;
  } catch (error) {
    console.warn('Failed to import encryption key - encryption disabled:', error);
    encryptionEnabled = false;
    return null;
  }
}

async function encrypt(text: string | null): Promise<string | null> {
  if (!text) return null;
  
  const key = await getEncryptionKey();
  if (!key) {
    // If encryption is not available, store as plain text (for development)
    console.log('Encryption disabled - storing value as plain text');
    return text;
  }
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );
  
  // Combine IV and ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  // Convert to base64
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(encryptedText: string | null): Promise<string | null> {
  if (!encryptedText) return null;
  
  try {
    const key = await getEncryptionKey();
    
    // If encryption is not available, return as-is (might be plain text)
    if (!key) {
      console.log('Encryption disabled - returning value as-is');
      return encryptedText;
    }
    
    // Decode base64
    const combined = new Uint8Array(
      atob(encryptedText).split('').map(char => char.charCodeAt(0))
    );
    
    // Extract IV and ciphertext
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    // Return the value as-is if decryption fails (could be plain text data)
    return encryptedText;
  }
}

// Helper to decrypt affiliate payout details
async function decryptAffiliatePayoutDetails(affiliate: any): Promise<any> {
  if (!affiliate) return affiliate;
  
  return {
    ...affiliate,
    paypal_email: await decrypt(affiliate.paypal_email),
    venmo_username: await decrypt(affiliate.venmo_username),
    bank_account_name: await decrypt(affiliate.bank_account_name),
    bank_routing_number: await decrypt(affiliate.bank_routing_number),
    bank_account_number: await decrypt(affiliate.bank_account_number),
  };
}

// Helper to mask sensitive data for non-admin views
function maskSensitiveData(value: string | null): string | null {
  if (!value) return null;
  if (value.length <= 4) return '****';
  return value.substring(0, 2) + '****' + value.substring(value.length - 2);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { action, ...params } = await req.json();
    console.log(`Affiliate API action: ${action}`);

    switch (action) {
      case 'apply_affiliate': {
        // Check if user already has an affiliate record
        const { data: existing } = await supabase
          .from('affiliates')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (existing) {
          const decryptedExisting = await decryptAffiliatePayoutDetails(existing);
          return new Response(JSON.stringify({ 
            success: true, 
            affiliate: decryptedExisting,
            message: existing.status === 'pending' 
              ? 'Application already submitted and under review' 
              : 'Already an affiliate'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Encrypt sensitive payout details before storing
        const encryptedPaypalEmail = await encrypt(params.paypal_email || null);
        const encryptedVenmoUsername = await encrypt(params.venmo_username || null);
        const encryptedBankAccountName = await encrypt(params.bank_account_name || null);
        const encryptedBankRoutingNumber = await encrypt(params.bank_routing_number || null);
        const encryptedBankAccountNumber = await encrypt(params.bank_account_number || null);

        // Create new affiliate application (pending status)
        const { data: newAffiliate, error: createError } = await supabase
          .from('affiliates')
          .insert({
            user_id: user.id,
            payout_method: params.payout_method || 'paypal',
            paypal_email: encryptedPaypalEmail,
            venmo_username: encryptedVenmoUsername,
            bank_account_name: encryptedBankAccountName,
            bank_routing_number: encryptedBankRoutingNumber,
            bank_account_number: encryptedBankAccountNumber,
            application_reason: params.application_reason || null,
            status: 'pending', // Applications require approval
            applied_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          console.error('Create affiliate application error:', createError);
          return new Response(JSON.stringify({ error: createError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Return decrypted data to user
        const decryptedAffiliate = await decryptAffiliatePayoutDetails(newAffiliate);

        return new Response(JSON.stringify({ 
          success: true, 
          affiliate: decryptedAffiliate,
          message: 'Application submitted successfully! We will review and get back to you.'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_affiliate_stats': {
        const { data: affiliate, error: affiliateError } = await supabase
          .from('affiliates')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (affiliateError || !affiliate) {
          return new Response(JSON.stringify({ 
            success: true,
            isAffiliate: false 
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Decrypt payout details for the user
        const decryptedAffiliate = await decryptAffiliatePayoutDetails(affiliate);

        // Get commissions
        const { data: commissions } = await supabase
          .from('affiliate_commissions')
          .select('*')
          .eq('affiliate_id', affiliate.id)
          .order('created_at', { ascending: false });

        // Get payouts
        const { data: payouts } = await supabase
          .from('affiliate_payouts')
          .select('*')
          .eq('affiliate_id', affiliate.id)
          .order('requested_at', { ascending: false });

        // Get referred users count
        const { count: referredCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('referred_by', affiliate.id);

        // Calculate next payout date (every 60 days from last payout or creation)
        const lastPayoutDate = affiliate.last_payout_date 
          ? new Date(affiliate.last_payout_date) 
          : new Date(affiliate.created_at);
        const nextPayoutDate = new Date(lastPayoutDate);
        nextPayoutDate.setDate(nextPayoutDate.getDate() + 60);

        return new Response(JSON.stringify({
          success: true,
          affiliate: decryptedAffiliate,
          commissions: commissions || [],
          payouts: payouts || [],
          referredUsersCount: referredCount || 0,
          nextPayoutDate: nextPayoutDate.toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'update_payout_details': {
        const { data: affiliate, error: affiliateError } = await supabase
          .from('affiliates')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (affiliateError || !affiliate) {
          return new Response(JSON.stringify({ error: 'Not an affiliate' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Encrypt sensitive payout details before updating
        const encryptedPaypalEmail = await encrypt(params.paypal_email || null);
        const encryptedVenmoUsername = await encrypt(params.venmo_username || null);
        const encryptedBankAccountName = await encrypt(params.bank_account_name || null);
        const encryptedBankRoutingNumber = await encrypt(params.bank_routing_number || null);
        const encryptedBankAccountNumber = await encrypt(params.bank_account_number || null);

        const { error: updateError } = await supabase
          .from('affiliates')
          .update({
            paypal_email: encryptedPaypalEmail,
            venmo_username: encryptedVenmoUsername,
            bank_account_name: encryptedBankAccountName,
            bank_routing_number: encryptedBankRoutingNumber,
            bank_account_number: encryptedBankAccountNumber,
            payout_method: params.payout_method || 'paypal',
            updated_at: new Date().toISOString()
          })
          .eq('id', affiliate.id);

        if (updateError) {
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'validate_referral_code': {
        const { code } = params;
        
        const { data: affiliate, error } = await supabase
          .from('affiliates')
          .select('id, referral_code, status')
          .eq('referral_code', code.toUpperCase())
          .eq('status', 'active')
          .single();

        if (error || !affiliate) {
          return new Response(JSON.stringify({ 
            valid: false,
            error: 'Invalid referral code' 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ 
          valid: true,
          affiliate_id: affiliate.id,
          discount_percent: 10 // 10% discount for referred users
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'track_referral_signup': {
        const { referral_code } = params;
        
        // Get affiliate by referral code
        const { data: affiliate } = await supabase
          .from('affiliates')
          .select('id')
          .eq('referral_code', referral_code.toUpperCase())
          .eq('status', 'active')
          .single();

        if (!affiliate) {
          return new Response(JSON.stringify({ error: 'Invalid referral code' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Update user profile with referred_by
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            referred_by: affiliate.id,
            referral_discount_applied: false // They haven't used their discount yet
          })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Track referral error:', updateError);
        }

        // Increment referral count
        await supabase.rpc('increment_affiliate_referrals', { aff_id: affiliate.id });

        return new Response(JSON.stringify({ 
          success: true,
          discount_percent: 10
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'check_referral_discount': {
        // Check if user has a referral discount available
        const { data: profile } = await supabase
          .from('profiles')
          .select('referred_by, referral_discount_applied')
          .eq('user_id', user.id)
          .single();

        if (!profile?.referred_by || profile.referral_discount_applied) {
          return new Response(JSON.stringify({ 
            has_discount: false 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Check if affiliate is still active
        const { data: affiliate } = await supabase
          .from('affiliates')
          .select('status')
          .eq('id', profile.referred_by)
          .single();

        return new Response(JSON.stringify({ 
          has_discount: affiliate?.status === 'active',
          discount_percent: 10
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Admin actions
      case 'admin_get_all_affiliates': {
        const { data: isAdmin } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data: affiliates, error } = await supabase
          .from('affiliates')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Fetch profiles and decrypt payout details for each affiliate
        const affiliatesWithProfiles = await Promise.all(
          (affiliates || []).map(async (affiliate) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email, username')
              .eq('user_id', affiliate.user_id)
              .single();
            
            // Decrypt payout details for admin view
            const decryptedAffiliate = await decryptAffiliatePayoutDetails(affiliate);
            
            return { ...decryptedAffiliate, profiles: profile };
          })
        );

        return new Response(JSON.stringify({ 
          success: true, 
          affiliates: affiliatesWithProfiles 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'admin_approve_affiliate': {
        const { data: isAdmin } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { affiliate_id } = params;

        // Get affiliate's user_id first
        const { data: affiliate } = await supabase
          .from('affiliates')
          .select('user_id, referral_code')
          .eq('id', affiliate_id)
          .single();

        const { error } = await supabase
          .from('affiliates')
          .update({ 
            status: 'active',
            approved_at: new Date().toISOString(),
            approved_by: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', affiliate_id);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Send notification to affiliate
        if (affiliate?.user_id) {
          await supabase.from('notifications').insert({
            user_id: affiliate.user_id,
            title: '🎉 Affiliate Application Approved!',
            message: `Congratulations! Your affiliate application has been approved. Your referral code is ${affiliate.referral_code}. Start sharing and earning 25% commission!`,
            type: 'affiliate_approved',
            link: '/affiliate'
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'admin_reject_affiliate': {
        const { data: isAdmin } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { affiliate_id } = params;

        // Get affiliate's user_id first
        const { data: affiliate } = await supabase
          .from('affiliates')
          .select('user_id')
          .eq('id', affiliate_id)
          .single();

        const { error } = await supabase
          .from('affiliates')
          .update({ 
            status: 'suspended',
            updated_at: new Date().toISOString()
          })
          .eq('id', affiliate_id);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Send notification to affiliate
        if (affiliate?.user_id) {
          await supabase.from('notifications').insert({
            user_id: affiliate.user_id,
            title: 'Affiliate Application Update',
            message: 'Your affiliate application was not approved at this time. Please contact support for more information.',
            type: 'affiliate_rejected',
            link: '/affiliate'
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'admin_get_all_commissions': {
        const { data: isAdmin } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data: commissions, error } = await supabase
          .from('affiliate_commissions')
          .select('*')
          .order('created_at', { ascending: false });

        // Fetch affiliate data for each commission
        const commissionsWithAffiliates = await Promise.all(
          (commissions || []).map(async (commission) => {
            const { data: affiliate } = await supabase
              .from('affiliates')
              .select('referral_code, user_id')
              .eq('id', commission.affiliate_id)
              .single();
            return { ...commission, affiliates: affiliate };
          })
        );

        return new Response(JSON.stringify({ 
          success: true, 
          commissions: commissionsWithAffiliates 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'admin_get_pending_payouts': {
        const { data: isAdmin } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data: payouts, error } = await supabase
          .from('affiliate_payouts')
          .select('*')
          .eq('status', 'pending')
          .order('requested_at', { ascending: true });

        // Fetch affiliate data for each payout and decrypt payout details
        const payoutsWithAffiliates = await Promise.all(
          (payouts || []).map(async (payout) => {
            const { data: affiliate } = await supabase
              .from('affiliates')
              .select('*')
              .eq('id', payout.affiliate_id)
              .single();
            
            // Decrypt payout details for admin processing
            const decryptedAffiliate = affiliate ? await decryptAffiliatePayoutDetails(affiliate) : null;
            
            return { ...payout, affiliates: decryptedAffiliate };
          })
        );

        return new Response(JSON.stringify({ 
          success: true, 
          payouts: payoutsWithAffiliates 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'admin_process_payout': {
        const { data: isAdmin } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { payout_id, status, admin_notes } = params;

        const { data: payout, error: payoutError } = await supabase
          .from('affiliate_payouts')
          .select('*, affiliates(*)')
          .eq('id', payout_id)
          .single();

        if (payoutError || !payout) {
          return new Response(JSON.stringify({ error: 'Payout not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { error: updateError } = await supabase
          .from('affiliate_payouts')
          .update({
            status,
            admin_notes,
            processed_at: new Date().toISOString(),
            processed_by: user.id
          })
          .eq('id', payout_id);

        if (updateError) {
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // If payout is completed, update affiliate's paid_earnings and pending_earnings
        if (status === 'completed') {
          await supabase
            .from('affiliates')
            .update({
              paid_earnings: (payout.affiliates?.paid_earnings || 0) + payout.amount,
              pending_earnings: Math.max(0, (payout.affiliates?.pending_earnings || 0) - payout.amount),
              last_payout_date: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', payout.affiliate_id);

          // Send notification
          if (payout.affiliates?.user_id) {
            await supabase.from('notifications').insert({
              user_id: payout.affiliates.user_id,
              title: '💰 Payout Processed!',
              message: `Your payout of $${payout.amount.toFixed(2)} has been processed via ${payout.payout_method}.`,
              type: 'payout_completed',
              link: '/affiliate'
            });
          }
        } else if (status === 'rejected') {
          // Send notification for rejected payout
          if (payout.affiliates?.user_id) {
            await supabase.from('notifications').insert({
              user_id: payout.affiliates.user_id,
              title: 'Payout Update',
              message: `Your payout request was not approved. ${admin_notes ? `Reason: ${admin_notes}` : 'Please contact support for more information.'}`,
              type: 'payout_rejected',
              link: '/affiliate'
            });
          }
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'admin_update_commission_rate': {
        const { data: isAdmin } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { affiliate_id, commission_rate } = params;

        if (commission_rate < 0 || commission_rate > 1) {
          return new Response(JSON.stringify({ error: 'Invalid commission rate' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { error } = await supabase
          .from('affiliates')
          .update({ 
            commission_rate,
            updated_at: new Date().toISOString()
          })
          .eq('id', affiliate_id);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'admin_create_commission': {
        const { data: isAdmin } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { affiliate_id, payment_amount, commission_rate, referred_user_id, payment_type, notes } = params;

        // Get affiliate to verify it exists
        const { data: affiliate, error: affiliateError } = await supabase
          .from('affiliates')
          .select('commission_rate')
          .eq('id', affiliate_id)
          .single();

        if (affiliateError || !affiliate) {
          return new Response(JSON.stringify({ error: 'Affiliate not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const actualCommissionRate = commission_rate || affiliate.commission_rate;
        const commissionAmount = payment_amount * actualCommissionRate;

        // Calculate commission expiry (12 months from referral)
        const commissionExpiresAt = new Date();
        commissionExpiresAt.setFullYear(commissionExpiresAt.getFullYear() + 1);

        const { error: createError } = await supabase
          .from('affiliate_commissions')
          .insert({
            affiliate_id,
            referred_user_id,
            payment_amount,
            commission_rate: actualCommissionRate,
            commission_amount: commissionAmount,
            payment_type: payment_type || 'subscription',
            notes,
            commission_expires_at: commissionExpiresAt.toISOString(),
            status: 'pending'
          });

        if (createError) {
          return new Response(JSON.stringify({ error: createError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Affiliate API error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
