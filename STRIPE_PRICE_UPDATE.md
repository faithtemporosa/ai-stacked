# Stripe Price ID Update

## Required Change

Update the Volume Saver tier price ID in Supabase secrets.

### Steps:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/wjofzwelziocuxdjicnc/settings/secrets

2. Update the following environment secret:
   - **Secret Name**: `STRIPE_PRICE_VOLUME_SAVER`
   - **New Value**: `price_1Sg5IrFmhb5GR0vFPxl1n8LF`

3. After updating, redeploy the affected Edge Functions:
   - `create-checkout-session`
   - `stripe-admin`
   - `stripe-webhook`

### Verification

After updating, verify the change is working by:
1. Testing a checkout with 2-3 automations
2. Checking that the correct Stripe price ID is used in the checkout session

### Related Files
- `supabase/functions/create-checkout-session/index.ts` - Uses this price ID for 2-3 automation purchases
- `supabase/functions/stripe-admin/index.ts` - Displays this configuration
- `src/pages/Cart.tsx` - Frontend tier display ($89 for 2-3 automations)
